---
title: 网络请求、异步编程、事务处理
categories: 跨平台开发
date: 2026-11-08
tags: [KMP, 协程, Ktor, 跨平台桥接]
description: 在 commonMain 中用 expect/actual 桥接平台能力，用协程组织异步、用 Ktor 发请求、用本地库处理事务。
AIGC:
  Label: 1
  ContentProducer: 001191320114777023172010000
  ProduceID: voiceassistant-1ec206b0058b44cc
  ReservedCode1: 
  ContentPropagator: 001191320114777023172010000
  PropagateID: voiceassistant-1ec206b0058b44cc
---

> 本文面向**初学者**，介绍在 CPF-KMP-CMP 工程中如何组织跨平台业务逻辑：网络请求怎么做、异步代码怎么写、数据库事务怎么处理，以及最核心的——**如何在 `commonMain` 中用 `expect` / `actual` 关键字完成与鸿蒙 / iOS 平台的功能桥接**。
>
> 本文整合自 KMP 支持构建鸿蒙二进制产物开发指南、三方库、KMP 协程 QoS 优先级设置使用手册、CAPI 用户手册、跨语言调用用户手册。

---

## 一、先建立全局观：代码放在哪一层

KMP 工程按**源集（source set）**组织代码，编译某一目标时，Konan 会把 `commonMain + 平台中间层 + 架构层` 合并为一个编译单元：

```
composeApp/src/
├── commonMain/       # 全平台共享：业务逻辑、UI、网络/数据库调用（expect 声明）
├── ohosMain/         # 鸿蒙公共实现（actual、平台 API 调用）
├── ohosArm64Main/    # 鸿蒙真机特有实现
├── ohosX64Main/      # 鸿蒙模拟器特有实现
├── androidMain/      # Android 实现（actual）
└── iosMain/          # iOS 实现（actual）
```

**初学者记住一条原则**：业务逻辑尽量留在 `commonMain`，平台差异通过 `expect` / `actual` 隔离。

---

## 二、expect / actual：跨平台桥接的核心机制

### 2.1 是什么

`expect` / `actual` 是 KMP 的"接口与实现"机制：

- **`expect`（期望）**：写在 `commonMain`，声明"每个平台都必须提供这个东西"——可以是函数、类、属性；
- **`actual`（实际）**：写在各平台源集（`ohosArm64Main`、`iosMain`、`androidMain` 等），提供该平台的具体实现。

编译期完成配对：编译鸿蒙目标时用鸿蒙的 actual，编译 iOS 目标时用 iOS 的 actual。**业务代码只调用 expect，完全不感知平台差异。**

### 2.2 最小示例：获取平台名

**第 1 步：`commonMain` 中声明（expect）**

```kotlin
// composeApp/src/commonMain/kotlin/com/example/demo/Platform.kt

// 定义一个平台接口
interface Platform {
    val name: String
}

// 声明预期函数：获取当前平台实例
expect fun getPlatform(): Platform
```

**第 2 步：鸿蒙平台实现（actual）**

```kotlin
// composeApp/src/ohosArm64Main/kotlin/com/example/demo/OhosPlatform.kt

class OhosPlatform : Platform {
    // 鸿蒙端目前通过静态字符串标识，后续可结合 NAPI 获取系统详细信息
    override val name: String = "HarmonyOS"
}

actual fun getPlatform(): Platform = OhosPlatform()
```

**第 3 步：iOS 平台实现（actual）**

```kotlin
// composeApp/src/iosMain/kotlin/com/example/demo/IosPlatform.kt

class IosPlatform : Platform {
    override val name: String = "iOS"
}

actual fun getPlatform(): Platform = IosPlatform()
```

（Android 同理，在 `androidMain` 中提供 `actual`。）

**第 4 步：`commonMain` 业务代码直接调用**

```kotlin
// composeApp/src/commonMain/kotlin/com/example/demo/Greeting.kt
class Greeting {
    private val platform = getPlatform()   // 编译期自动绑定到当前平台的 actual

    fun greet(): String = "Hello, ${platform.name}!"
}
```

在鸿蒙真机上运行输出 `Hello, HarmonyOS!`，在 iPhone 上输出 `Hello, iOS!`——同一份业务代码。

### 2.3 典型桥接场景

| 场景 | expect/actual 怎么用 |
| --- | --- |
| 平台信息（型号、系统版本） | `expect fun getPlatform(): Platform`，各平台 actual 返回各自实现 |
| 平台专有算法/自有 C 库 | `expect fun sampleAdd(a: Int, b: Int): Int`，鸿蒙侧 actual 通过 cinterop 调 C 函数 |
| 系统能力（日志、传感器等） | 优先用社区封装好的多平台库（见下文三方库），或鸿蒙侧 actual 调 ohosCAPI |
| 与 ArkTS 壳工程交互 | 鸿蒙侧用 AKInterop FFI（见 5.2 节），不进 commonMain |

### 2.4 鸿蒙侧 actual 调用系统能力的两条通道

当鸿蒙的 actual 实现需要调用系统能力时，有两条通道（可并存）：

**通道 1：ohosCAPI（推荐，直接调鸿蒙 C API）**

鸿蒙系统 C API 已由社区通过 cinterop 预封装为 Kotlin 库，包名规则为 `platform.<Kit>.<Module>`。例如调用 HiLog：

```kotlin
// ohosMain 中
import platform.PerformanceAnalysisKit.HiLog.*

fun logHello() {
    OH_LOG_Print(
        type   = LOG_APP,
        level  = LOG_INFO,
        domain = 0x0001u,
        tag    = "MyTag",
        fmt    = "Hello from Kotlin/Native CAPI"
    )
}
```

查找包名三步：在[华为官方 API 参考](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/development-intro-api)找到目标函数 → 确认所属 Kit 与模块 → 拼装 `platform.<Kit>.<Module>`。支持 API 17～22，并内置版本防护（低版本设备调用高版本 API 抛 `IllegalStateException`，可用 `OH_GetSdkApiVersion()` 预先分支判断）。

**通道 2：AKInterop FFI（与 ArkTS 互操作）**

- **ArkTS → Kotlin**：Kotlin 侧加 `@KNExport*` 注解，KSP 自动生成 NAPI 包装与 `.d.ts`，ArkTS 直接 `import nativeModule from 'libentry.so'` 调用；
- **Kotlin → ArkTS**：ArkTS 侧加 `@ExportClass` 等装饰器，`arkts-ffi-converter` 生成 Kotlin 代理类。

详见 跨语言调用用户手册。

---

## 三、异步编程：kotlinx-coroutines

### 3.1 引入依赖

鸿蒙侧使用社区发布的协程库（在 `gradle/libs.versions.toml` 中声明，版本以 三方库 总览表为准）：

```toml
[versions]
kotlinx-coroutines = "1.10.2-1.0.0"
atomicFu = "0.31.0-1.0.0"

[libraries]
kotlinx-coroutines-core = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-core", version.ref = "kotlinx-coroutines" }
atomicFu = { module = "org.jetbrains.kotlinx:atomicfu", version.ref = "atomicFu" }
```

```kotlin
// composeApp/build.gradle.kts
commonMain.dependencies {
    implementation(libs.kotlinx.coroutines.core)
    implementation(libs.atomicFu)
}
```

### 3.2 基础用法（写在 commonMain，全平台一致）

```kotlin
import kotlinx.coroutines.async
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking

// 异步计算：async 提交到 Default 调度器，await 等待结果
fun coroutinesDemoText(): String = runBlocking {
    val deferred = async(Dispatchers.Default) {
        (1..100).sum()
    }
    val sum = deferred.await()
    "Coroutines demo sum(1..100) = $sum"
}
```

在 Compose 界面中触发异步任务，用 `LaunchedEffect`（进入组合时启动协程，离开时自动取消）：

```kotlin
@Composable
fun UserListScreen() {
    var users by remember { mutableStateOf<List<User>>(emptyList()) }

    LaunchedEffect(Unit) {
        users = fetchUsers()   // suspend 函数，自动在后台执行
    }
    LazyColumn { items(users, key = { it.id }) { UserItem(it) } }
}
```

### 3.3 鸿蒙特有：协程 QoS 优先级

鸿蒙系统按任务与用户交互的关联程度调度任务（QoS，Quality of Service）。KMP 协程支持在提交任务时指定 QoS 等级：

| QoS 等级 | 使用场景 |
| --- | --- |
| `FFRT_QOS_BACKGROUND` | 后台不可见任务（数据同步、备份） |
| `FFRT_QOS_UTILITY` | 不需立即响应的任务（下载、导入数据） |
| `FFRT_QOS_DEFAULT` | 默认 |
| `FFRT_QOS_USER_INITIATED` | 用户触发且可见进展的任务（打开文档） |
| `FFRT_QOS_DEADLINE_REQUEST` | 越快越好的关键任务（页面加载） |
| `FFRT_QOS_USER_INTERACTIVE` | 用户交互任务（UI 线程、刷新界面、动效） |

```kotlin
// 不指定 Qos：默认自动使用 FFRT_QOS_USER_INITIATED
launch(Dispatchers.Default) { /* 业务逻辑 */ }

// 指定后台低优先级（如批量同步）
launch(Dispatchers.Default + Qos.FFRT_QOS_BACKGROUND) { /* 后台任务 */ }

// 指定最高交互优先级（如首屏加载）
launch(Dispatchers.Default + Qos.FFRT_QOS_USER_INTERACTIVE) { /* 高优交互任务 */ }
```

**约束**：仅支持 `Dispatchers.Default` 调度器；仅鸿蒙系统生效（其他平台可正常编译但不生效，多端兼容）。验证方法：任务会执行在名为 `OS_FFRT_[QoS]_[Id]` 的 FFRT 线程池上。

---

## 四、网络请求：Ktor

### 4.1 依赖引入

Ktor 已完成鸿蒙化适配（推荐版本见 三方库 总览表，如 `3.3.3-1.1.0`）：

```toml
[versions]
ktor = "3.3.3-1.1.0"
kotlinx-serialization = "1.9.1-1.0.0"

[libraries]
ktor-client-core = { module = "io.ktor:ktor-client-core", version.ref = "ktor" }
ktor-client-content-negotiation = { module = "io.ktor:ktor-client-content-negotiation", version.ref = "ktor" }
ktor-serialization-kotlinx-json = { module = "io.ktor:ktor-serialization-kotlinx-json", version.ref = "ktor" }
kotlinx-serialization-json = { module = "org.jetbrains.kotlinx:kotlinx-serialization-json", version.ref = "kotlinx-serialization" }
```

> 注意：Maven 仓库需添加社区公仓 `https://maven.eazytec-cloud.com/nexus/repository/maven-public/`（配置在 `settings.gradle.kts` 的 `pluginManagement` 与 `dependencyResolutionManagement` 中）。

### 4.2 在 commonMain 中封装 API 客户端

```kotlin
// composeApp/src/commonMain/kotlin/com/example/demo/ApiClient.kt
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import kotlinx.serialization.Serializable

@Serializable
data class User(val id: String, val name: String)

class ApiClient(private val client: HttpClient) {

    // suspend 函数：调用方在协程中使用
    suspend fun fetchUsers(): List<User> {
        val response: HttpResponse = client.get("https://example.com/api/users")
        return response.body()
    }

    suspend fun createUser(user: User): User =
        client.post("https://example.com/api/users") {
            setBody(user)
        }.body()
}
```

界面层配合协程使用：

```kotlin
@Composable
fun UserListScreen(apiClient: ApiClient) {
    var users by remember { mutableStateOf<List<User>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        users = apiClient.fetchUsers()   // 网络请求在后台执行
        loading = false
    }

    if (loading) Text("加载中…") else LazyColumn {
        items(users, key = { it.id }) { Text(it.name) }
    }
}
```

> 完整可运行示例见社区示例工程 [ktor-demo](https://gitcode.com/CPF-KMP-CMP/kmp-thirdlibdemo/tree/main-1.0.0-OH/ktor-demo)。

### 4.3 网络图片加载

网络图片需额外依赖图像加载库（Coil 已鸿蒙化适配），或按需在 commonMain 自行封装；资源图片直接用 `painterResource(Res.drawable.xxx)`。

---

## 五、事务处理：本地数据存储

"事务"指**一组必须全部成功或全部失败的操作**，最典型的场景是数据库写入。鸿蒙化 KMP 生态提供多个已适配的存储方案，全部在 `commonMain` 中使用：

| 方案 | 鸿蒙化版本（示例） | 适用场景 |
| --- | --- | --- |
| **androidx-room3** | `3.0.0-alpha01-0.3.0` | SQLite ORM 抽象层，注解定义实体与 DAO |
| **SQLDelight** | `2.2.1-1.1.0` | 从 SQL 语句生成类型安全的 Kotlin API |
| **androidx-sqlite** | `2.7.0-alpha01-0.3.0` | 跨平台 SQLite 基础操作 |
| **androidx-datastore** | `1.3.0-alpha05-0.3.0` | 键值对 / 类型化对象存储（偏好设置） |
| **multiplatform-settings** | `1.3.0-1.0.0` | 轻量键值对存储 |

### 5.1 选择建议（初学者）

- **保存用户偏好**（主题、开关、token）→ DataStore 或 multiplatform-settings；
- **结构化业务数据**（聊天记录、离线缓存）→ Room3 或 SQLDelight；
- 两者都基于 SQLite，事务语义一致：**事务内的所有写操作要么全部提交，要么全部回滚**。

### 5.2 事务的基本形态

以 SQLDelight 为例（Room3 中对应 `@Transaction` 注解的 DAO 方法 / `withTransaction`，语义相同）：

```kotlin
// 伪代码示意事务语义：转账 = 扣款 + 入账，必须同成败
suspend fun transferMoney(fromId: String, toId: String, amount: Long) {
    database.transaction {
        // 事务块内：任一步骤失败，已执行的写操作全部回滚
        accountQueries.decreaseBalance(fromId, amount)
        accountQueries.increaseBalance(toId, amount)
        check(accountQueries.balanceOf(fromId).executeAsOne() >= 0) {
            "余额不能为负，整体回滚"
        }
    }
}
```

要点：

1. **把"必须同成败"的多个写操作放进同一个事务**，不要拆成多次独立写入；
2. 事务函数通常是 `suspend` 的，在协程中调用，配合 `Dispatchers.IO` 类后台调度避免阻塞界面；
3. 数据库操作与网络请求可以组合：先请求 API（Ktor），成功后在一个事务里落库，失败则不写任何脏数据。

> 完整可运行示例：[androidx-room3-demo](https://gitcode.com/CPF-KMP-CMP/kmp-thirdlibdemo/tree/main-1.0.0-OH/androidx-room3-demo)、[sqldelight-demo](https://gitcode.com/CPF-KMP-CMP/kmp-thirdlibdemo/tree/main-1.0.0-OH/sqldelight-demo)、[androidx-datastore-demo](https://gitcode.com/CPF-KMP-CMP/kmp-thirdlibdemo/tree/main-1.0.0-OH/androidx-datastore-demo)。

---

## 六、把三者串起来：一个典型的数据流

```
用户进入页面
    → LaunchedEffect 启动协程（commonMain）
        → Ktor 发起网络请求（suspend，后台执行）
            → 成功：在一个数据库事务中落库（Room3 / SQLDelight）
            → 失败：读取本地缓存展示
        → 更新 mutableStateOf 状态
    → Compose 界面自动重组刷新
```

- **网络层、数据层、UI 层全部在 `commonMain`**，一套代码三端运行；
- 只有真正平台差异的能力（如鸿蒙特有的系统能力）才下沉到 `ohosMain` 用 `actual` + ohosCAPI/FFI 实现；
- 后台批量任务记得加 `Qos.FFRT_QOS_BACKGROUND`，首屏关键加载用 `Qos.FFRT_QOS_USER_INTERACTIVE`。

---

## 七、常见问题

**Q1：commonMain 里可以用哪些库？**
必须是 Kotlin 多平台库且包含鸿蒙变体。社区已适配 37+ 常用库（协程、序列化、Ktor、Room、SQLDelight、Coil、Koin、kermit 日志等），完整清单见 三方库。AndroidX 中 JVM 独有的库（如 `androidx.activity:*`）**不能**放 commonMain。

**Q2：expect 声明了但某个平台忘了写 actual 会怎样？**
编译该平台目标时直接报错，编译期即暴露问题，不会带到运行时。

**Q3：moko-resource 在 API 17 设备上崩溃？**
旧版本不支持 API 17，升级到 `0.26.0-0.1.0-01` 及以上（见 三方库 FAQ）。

**Q4：Maven 依赖同步很慢或超时？**
去除仓库中未使用的三方库声明，并把依赖多的仓库地址排在前面（见 编译构建类 FAQ）。

**Q5：KNOI 和公版 FFI 不兼容？**
KNOI 依赖的 coroutine 和 KSP 版本与公版 FFI 不匹配。推荐直接切换到公版 FFI，或手动适配版本（见 FFI 类 FAQ）。

---

## 延伸阅读

| 文档 | 内容 |
| --- | --- |
| KMP 支持构建鸿蒙二进制产物开发指南 | expect/actual 完整示例、协程集成、cinterop 封装 C 库 |
| 三方库 / 三方库示例 | 全部已适配库清单与可运行 Demo |
| KMP 协程 QoS 优先级设置使用手册 | QoS 等级定义与约束 |
| CAPI 用户手册 | ohosCAPI 包命名、类型映射、版本防护 |
| 跨语言调用用户手册 | AKInterop 双向 FFI |
| [Kotlin 官方：expect/actual](https://kotlinlang.org/docs/multiplatform-expect-actual.html) | 上游机制说明 |


内容由AI生成
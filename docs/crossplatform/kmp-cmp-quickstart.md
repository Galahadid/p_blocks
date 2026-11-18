---
title: 快速入门：把第一个 KMP 应用跑到鸿蒙上
categories: 跨平台开发
date: 2026-11-08
tags: [KMP, CMP, 鸿蒙, 环境搭建]
description: 从零理解 CPF-KMP-CMP 是什么、环境怎么装，15 分钟内把第一个应用跑到鸿蒙设备上。
AIGC:
  Label: 1
  ContentProducer: 001191320114777023172010000
  ProduceID: voiceassistant-144df17d0baa491c
  ReservedCode1: 
  ContentPropagator: 001191320114777023172010000
  PropagateID: voiceassistant-144df17d0baa491c
---

> 本文面向**零基础初学者**，帮助你从零开始理解 CPF-KMP-CMP 是什么、需要准备什么环境，并在 15 分钟内把第一个应用运行到鸿蒙设备上。
>
> 本文是对 快速开始、框架介绍、入门指南 的初学者友好整合版，细节以原文档为准。

---

## 一、CPF-KMP-CMP 是什么

**一句话：用 Kotlin 语言和 Compose UI 框架，编写一次代码，同时运行在 Android、iOS 和 HarmonyOS（鸿蒙）上。**

传统鸿蒙应用使用 ArkTS + ArkUI 开发。如果你已经会 Kotlin / Compose（或者团队已有 Android 项目），再学一套 ArkTS 意味着**同一份业务逻辑和 UI 要写两遍**。CPF-KMP-CMP 解决的就是这个问题：

| 你关心的 | CPF-KMP-CMP 的答案 |
| --- | --- |
| 用什么语言 | Kotlin（业务逻辑 + UI 全部用 Kotlin 写） |
| UI 框架 | Compose Multiplatform（CMP），API 与 Jetpack Compose 高度一致 |
| 支持哪些平台 | Android、iOS、HarmonyOS（新增 `ohosArm64` 真机 / `ohosX64` 模拟器目标） |
| 怎么跑到鸿蒙上 | Kotlin 代码编译为 `libkn.so`，由 ArkTS 壳工程加载运行 |
| 系统版本要求 | HarmonyOS **API 17 及以上** |

### 1.1 三个核心名词

初学者最容易混淆三个词，先建立直觉：

- **KMP（Kotlin Multiplatform）**：负责"跨平台"。把 Kotlin 代码编译成各平台的二进制产物（鸿蒙上是 `.so`）。
- **CMP（Compose Multiplatform）**：负责"UI"。提供声明式界面组件（按钮、列表、输入框等），写法与 Android 的 Jetpack Compose 基本一致。
- **ArkTS 壳工程（harmonyApp）**：鸿蒙应用的"外壳"。鸿蒙应用安装包（HAP）必须由壳工程打包，你的 Compose 界面通过它显示在屏幕上。

### 1.2 一次开发的代码流向

```
你在 Android Studio 里写的 Kotlin/Compose 代码（composeApp 模块）
        ↓ Gradle 编译
libkn.so（Kotlin/Native 二进制产物）
        ↓ publish 任务同步
harmonyApp（ArkTS 壳工程）
        ↓ DevEco Studio 签名 + 推包
鸿蒙真机 / 模拟器上运行
```

记住这条链路，后面所有环境配置都是为它服务的。

---

## 二、环境准备

### 2.1 需要安装的工具

| 工具 | 版本要求 | 用途 |
| --- | --- | --- |
| JDK | 17 及以上 | Gradle 构建基础 |
| Android Studio | Hedgehog (2023.1.1) 及以上 | 编写 Kotlin/Compose 代码的主 IDE |
| DevEco Studio | 6.0.0 及以上 | 鸿蒙签名、推包、设备调试 |
| HarmonyOS SDK | API 17 及以上 | 鸿蒙系统 API（DevEco Studio 内下载） |
| Gradle | 8.0 及以上 | 构建工具（Android Studio 自动下载） |

操作系统支持 Windows 10/11、macOS 12+、Ubuntu 20.04+。

### 2.2 安装步骤

**第 1 步：安装 JDK 17**

从 [Oracle JDK](https://www.oracle.com/java/technologies/downloads/) 或 [OpenJDK](https://openjdk.org/) 下载安装，验证：

```bash
java -version
# 输出类似 openjdk version "17.0.x" 即为成功
```

**第 2 步：安装 Android Studio**

下载安装 [Android Studio](https://developer.android.com/studio) Hedgehog 或更新版本，首次启动按向导完成配置。

**第 3 步：安装 DevEco Studio 并下载鸿蒙 SDK**

1. 下载安装 [DevEco Studio](https://developer.huawei.com/consumer/cn/deveco-studio/) 6.0.0 或更新版本；
2. 启动后进入 **SDK Manager**，下载 **HarmonyOS SDK API 17** 或更高版本。

**第 4 步：安装 KMP 工具链插件（离线安装）**

1. 从 附录 提供的地址下载插件安装包（`.tar.gz` 与 `.zip`）；
2. 打开 **Android Studio → Plugins → 齿轮图标 → Install Plugin from Disk...**；
3. 选择安装包，点击 **OK**，重启 Android Studio 生效。

> 如需完整的 KMP Android / iOS 功能体验，还需在 Marketplace 中安装 **Kotlin Multiplatform** 插件。

**第 5 步：配置 DevEco Studio 路径**

在项目根目录的 `local.properties` 中添加（路径替换为你实际安装的位置）：

```properties
# local.properties
local.deveco.path=/Applications/DevEco-Studio.app
```

保存后同步 Gradle 项目。

---

## 三、创建第一个工程

1. 启动 Android Studio，点击 **New Project**；
2. 在模板列表中选择新安装的 **KMP 工具链插件** 模板，点击 **Next**；
3. 填写工程名称、包名和保存路径；
4. 按需勾选 Android / iOS 目标平台（可选，只跑鸿蒙也可以）；
5. 点击 **Finish**，等待 Gradle 同步完成。

创建完成后，工程里最重要的两个目录：

```
你的工程/
├── composeApp/        # Kotlin/Compose 代码在这里（跨平台共享）
│   └── src/
│       ├── commonMain/    # 所有平台共用的代码（大部分代码写这里）
│       ├── ohosMain/      # 鸿蒙特有实现
│       ├── androidMain/   # Android 特有实现
│       └── iosMain/       # iOS 特有实现
└── harmonyApp/        # 鸿蒙壳工程（ArkTS，负责签名打包）
```

> **初学者建议**：业务代码和 UI 尽量写在 `commonMain`，只有平台差异的部分才下沉到 `ohosMain` 等目录。

---

## 四、配置应用签名（必做，否则无法安装）

鸿蒙应用**必须签名**后才能安装到真机或模拟器。签名在 **DevEco Studio** 中完成。

> **重要**：未完成签名时，点击 Run 可能编译成功但无法安装到设备。请先完成本节再运行。

### 4.1 注册华为开发者账号

1. 访问 [HarmonyOS 开发者官网](https://developer.huawei.com/consumer/cn/)，注册并完成**实名认证**；
2. 后续在 DevEco Studio 签名界面点击 **Sign In**，使用同一账号登录。

### 4.2 配置自动签名（推荐日常调试使用）

1. 用 **DevEco Studio** 打开 KMP 工程中的 **`harmonyApp`** 目录（注意：不是 Android Studio 工程根目录）；
2. 先连接目标设备（真机开 USB 调试，或在 DevEco 中启动模拟器），以便自动签名把设备 UDID 写入 Profile；
3. 进入 **File → Project Structure… → Project → Signing Configs**；
4. **同时勾选**以下两项：
   - **Support HarmonyOS**
   - **Automatically generate signature**
5. 若未登录，点击 **Sign In** 登录华为开发者账号；
6. 点击 **Apply → OK**，等待自动生成密钥（`.p12`）、证书（`.cer`）与 Profile（`.p7b`）。

> **注意**：
> - 只勾选 **Automatically generate signature** 而不勾选 **Support HarmonyOS**，会生成 Release 类型签名，**无法调试**；
> - 自动签名仅用于调试；上架发布须改用手动签名（见华为官方[配置调试签名](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/ide-signing)文档）；
> - 签名前确保本机系统时间与北京时间（UTC+8）一致，否则可能签名失败。

### 4.3 签名常见问题

| 现象 | 处理方法 |
| --- | --- |
| 签名失败或提示时间错误 | 检查系统时间是否为北京时间（UTC+8） |
| 应用无法安装到真机 | 确认已连接设备后重新执行自动签名；检查 Profile 是否包含该设备 UDID |
| Run 时提示签名相关错误 | 确认已在 DevEco Studio 打开 `harmonyApp` 并完成签名，且 **DevEco Studio 保持运行** |

---

## 五、运行到设备

### 运行前检查清单

- [ ] 已完成第四步签名配置
- [ ] **DevEco Studio 已启动并保持打开**（推包签名依赖 DevEco 能力）
- [ ] 目标鸿蒙设备（真机或模拟器）已连接且状态正常

### 运行

1. 在 **Android Studio** 工具栏的设备下拉框中选择目标鸿蒙设备；
2. 确认运行配置为 **harmonyApp**（默认）；
3. 点击 **Run（▶）**。

插件会自动完成：编译 KMP/CMP 产物 → 同步至 `harmonyApp` → 签名 → 推包安装。首次安装时设备可能弹出「允许安装来自此来源的应用」提示，按指引授权即可。

---

## 六、看懂你的第一个界面

工程创建好后，`composeApp/src/commonMain` 中已经有一个根 Composable（如 `App()`）。下面这段代码是**最短的可交互界面**——中间一句文字，下面一个按钮，点一下文字变化：

```kotlin
@Composable
fun MyFirstScreen() {
    // remember + mutableStateOf：让 count 在点击后"记住"并触发界面刷新
    var count by remember { mutableStateOf(0) }

    // Column：垂直排列子项
    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            text = if (count == 0) "点下面按钮" else "已点击 $count 次",
            style = MaterialTheme.typography.titleMedium,
        )
        Button(onClick = { count++ }) {
            Text("点我")
        }
    }
}
```

把 `MyFirstScreen()` 放进 `App()` 中调用，重新 Run，即可在真机上看到效果。

**这段代码里发生了什么：**

- `remember { mutableStateOf(0) }`：声明一个"会变的数"，它改变时界面自动刷新；
- `Column` / `Text` / `Button`：Compose 基础组件，在鸿蒙上的表现与 Android 一致；
- 你**没有写任何鸿蒙特有代码**——这就是跨平台的意义。

---

## 七、初学者常见疑问

**Q1：我需要先学 ArkTS 吗？**
不需要。日常开发都在 `commonMain` 写 Kotlin/Compose；只有需要调用鸿蒙特有能力（如系统分享、相机）或深度定制壳工程时，才会接触 ArkTS / ohosMain。

**Q2：我需要 Kotlin 基础吗？**
需要。建议先掌握：基础语法、空安全（`?` / `?.` / `!!`）、lambda 与 `data class`、协程基础（`suspend` / `launch` / `async`）。推荐 [Kotlin 语言之旅](https://kotlinlang.org/docs/kotlin-tour-welcome.html)（浏览器交互式，适合零基础）。

**Q3：模拟器和真机有什么区别？**
真机对应 `ohosArm64` 目标，模拟器（如 Windows 本地模拟器）对应 `ohosX64` 目标。工程中两者都已默认配置，选择对应设备运行即可。

**Q4：遇到问题去哪查？**
先查 FAQ 与 faqs 目录（编译构建类、CMP 渲染类、FFI 类、DFX 类、三方库类），再对照 工具链介绍 的常见问题章节。

---

## 八、下一步学习路径

按顺序推进，每一步都有对应文档：

| 阶段 | 文档 | 你将学会 |
| --- | --- | --- |
| 1. 理解框架 | 框架介绍 | CPF-KMP-CMP 的定位、组成与适用场景 |
| 2. 深入原理 | 架构介绍 | 代码如何被编译、产物如何在鸿蒙上运行 |
| 3. 工具使用 | 工具链介绍 | 工程同步、设备管理、编译运行、调试 |
| 4. UI 开发 | [如何构建 UI](如何构建UI.md)（本教程系列） | 用 Compose 组件搭建完整界面 |
| 5. 业务能力 | [网络请求、异步编程、事务处理](网络请求、异步编程、事务处理.md) | 网络请求、协程、数据库事务与平台桥接 |
| 6. 质量保障 | [性能优化](性能优化.md) | 让应用跑得快、占得少、构建得迅速 |

**外部资源**：
- [Kotlin 官方文档](https://kotlinlang.org/docs/home.html)
- [Kotlin Multiplatform 官方文档](https://kotlinlang.org/docs/multiplatform/)
- [Compose Multiplatform 官方文档](https://kotlinlang.org/docs/multiplatform/compose-multiplatform.html)
- [HarmonyOS 开发者官网](https://developer.huawei.com/consumer/cn/)


内容由AI生成
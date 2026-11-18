---
title: 如何构建 UI：一份代码跑三个平台
categories: 跨平台开发
date: 2026-11-08
tags: [KMP, CMP, Compose, UI]
description: Compose Multiplatform 的 UI 心智模型、工程配置、六大组件库、布局三件套与渲染模式选型。
AIGC:
  Label: 1
  ContentProducer: 001191320114777023172010000
  ProduceID: voiceassistant-1edb4190e674efde
  ReservedCode1: 
  ContentPropagator: 001191320114777023172010000
  PropagateID: voiceassistant-1edb4190e674efde
---

> 本文面向**有部分基础的程序员**：假设你已了解 Kotlin 基础语法、用过 Gradle，并对声明式 UI（状态驱动界面刷新）有初步概念，但不一定写过 Compose。
>
> 本文是对 CMP 组件库用户手册、CMP 自渲染用户手册、CMP 统一渲染用户手册 的实战导向整合，API 细节以原文档为准。

---

## 一、心智模型：一份 UI 代码，三个平台

CMP 的 UI 代码全部写在 **`commonMain`**，编译时由 Gradle 按目标平台自动解析为对应变体（Android 变体 / iOS 变体 / `ohosArm64`、`ohosX64` 鸿蒙变体）。**你不需要为鸿蒙单独写一套 UI**。

三端的差异只在"挂载到系统窗口"这一层：

| 平台 | 挂载方式 | 代码位置 |
| --- | --- | --- |
| Android | `ComponentActivity.setContent { App() }` | `androidMain/.../MainActivity.kt` |
| iOS | `ComposeUIViewController { App() }` 返回 ViewController 嵌入 UIKit | `iosMain/.../MainViewController.kt` |
| **鸿蒙** | Kotlin 侧 `MainArkUIViewController(env)` 经 NAPI 暴露，ArkTS 页面用 `Compose` 组件挂载 | `ohosMain/.../MainArkUIViewController.kt` + `harmonyApp/entry/.../Index.ets` |

### 1.1 鸿蒙端挂载代码（了解即可，模板已生成）

Kotlin 侧入口（`ohosMain`）：

```kotlin
@OptIn(ExperimentalNativeApi::class, ExperimentalForeignApi::class)
@CName("MainArkUIViewController")
fun MainArkUIViewController(env: napi_env): napi_value {
    initMainHandler(env)
    return ComposeArkUIViewController(env) {
        App()   // 与 Android/iOS 相同的根 Composable
    }
}
```

ArkTS 侧挂载页（`harmonyApp/entry/src/main/ets/pages/Index.ets`）：

```typescript
import { ArkUIViewController, Compose } from '@cpf-kmp-cmp/compose';
import nativeApi from 'libentry.so';

@Entry
@Component
struct Index {
  private controller: ArkUIViewController | undefined = undefined;

  aboutToAppear() {
    if (nativeApi !== undefined) {
      this.controller = nativeApi.MainArkUIViewController();
    }
  }

  build() {
    Column() {
      if (this.controller) {
        Compose({
          controller: this.controller,
          libraryName: 'entry',
          onBackPressed: () => this.controller!.onBackPress()
        })
      } else {
        Text('Native module not ready')
      }
    }
    .width('100%')
    .height('100%')
  }
}
```

**关键结论**：三端根 UI 均为同一个 `App()`，日常开发 99% 的时间你只在 `commonMain` 里写组件。

---

## 二、工程配置：依赖写在哪一层

KMP 按**源集（source set）**区分平台，依赖写在不同源集下只被对应平台编译链接：

| 源集 | 参与编译的平台 | 放什么 |
| --- | --- | --- |
| `commonMain` | 全部平台 | Compose 组件库、协程、Navigation、序列化等跨平台依赖 |
| `androidMain` | 仅 Android | `activity-compose`、`lifecycle-*-compose` 等 AndroidX 体系（JVM 世界独有，**不能**放 commonMain） |
| `ohosMain` | 仅鸿蒙 | `compose.multiplatform.export`（NAPI 导出必需，用 `api` 声明） |
| `ohosArm64Main` / `ohosX64Main` | 鸿蒙真机 / 模拟器 | 可选：`skiko-ohosarm64` / `skiko-ohosx64`（直接引用 Skiko 类型时才需要） |
| `iosMain` | 仅 iOS | 通常无需额外 Compose 依赖 |

`composeApp/build.gradle.kts` 核心配置：

```kotlin
plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.androidApplication)
    alias(libs.plugins.composeMultiplatform)
    alias(libs.plugins.composeCompiler)
    alias(libs.plugins.kotlinSerialization)   // 类型安全路由必需
}

kotlin {
    sourceSets {
        commonMain.dependencies {
            // Compose 五大件由 compose 插件提供，不写版本号
            implementation(compose.runtime)
            implementation(compose.foundation)
            implementation(compose.material)
            implementation(compose.material3)
            implementation(compose.ui)
            implementation(compose.components.resources)   // painterResource、stringResource
            implementation(libs.kotlinx.coroutines.core)
            implementation(libs.compose.navigation)        // 导航
            implementation(libs.kotlinx.serialization.json)
            implementation(libs.compose.ui.backhandler)    // BackHandler 多平台实现
        }
        ohosMain.dependencies {
            api(libs.compose.multiplatform.export)         // 必需：导出 NAPI 符号
        }
    }
}
```

版本统一在 `gradle/libs.versions.toml` 管理（示例工程参考版本线 `1.9.2-1.2.0`，以 版本说明 为准）。

**渲染模式**在根目录 `gradle.properties` 中选择：

```properties
rendererBackend=fusion-renderer   # 统一渲染（默认）
# rendererBackend=skia            # 自渲染
ohosSkikoVersion=0.9.22.2-1.2.0
```

> 修改渲染模式后需 **Sync → clean → 重新 link/publish**，避免链接到错误的 klib。

---

## 三、六大组件库速览

Compose UI 由六个核心库组成，每个库的职责与代表组件：

| 组件库 | 职责 | 代表组件 |
| --- | --- | --- |
| `compose.runtime` | 状态记忆与响应式更新 | `remember`、`mutableStateOf` |
| `compose.ui` | 基础布局与绘制 | `Column`、`Row`、`Box`、`Text`、`Image`、`Modifier` |
| `compose.foundation` | 基础组件与滚动 | `Button`、`TextField`、`LazyColumn`、`Card` |
| `compose.material` | Material 风格组件 | `Scaffold`、`TopAppBar`、`BottomNavigation` |
| `compose.material3` | Material 3 风格与主题 | M3 `Button` / `TextField`、`MaterialTheme` |
| `skiko` | 鸿蒙上的绘制引擎 | 无需手写，由插件自动配置 |

---

## 四、Modifier：所有组件通用的装饰器

`Modifier` 是链式配置对象，指定尺寸、内边距、背景、点击、滚动等。**多数组件都有 `modifier: Modifier = Modifier` 参数**。

**两个关键规则**：

1. **链式顺序影响效果**：先 `padding` 再 `background`，背景包住内边距；反过来内边距在背景外。
2. **可复用**：`val m = Modifier.padding(8.dp).fillMaxWidth()` 可在多处引用。

常用方法速查：

| 方法 | 作用 |
| --- | --- |
| `fillMaxSize()` / `fillMaxWidth()` / `fillMaxHeight()` | 占满父布局（宽/高/全部） |
| `size(w, h)` / `width(d)` / `height(d)` | 固定尺寸 |
| `padding(...)` | 内边距（支持四方向 / 水平垂直重载） |
| `background(color, shape)` | 背景色与可选圆角 |
| `clip(shape)` | 按形状裁剪（圆角、圆形头像） |
| `clickable { }` | 点击区域（非 Button 场景） |
| `verticalScroll(state)` / `horizontalScroll(state)` | 让 Column/Row 可滚动 |
| `align(...)` | 在父布局内对齐（仅 Box/Row/Column Scope 内有效） |
| `weight(1f)` | 在 Row/Column 内按比例分配空间（仅 Scope 内有效） |

```kotlin
// 顺序：先内边距 → 再背景 → 再圆角裁剪
Box(
    modifier = Modifier
        .padding(16.dp)
        .background(Color.LightGray, RoundedCornerShape(8.dp))
        .clip(RoundedCornerShape(8.dp))
        .size(200.dp),
) { ... }
```

---

## 五、布局三件套：Column / Row / Box

| 布局 | 排列方式 | 典型场景 |
| --- | --- | --- |
| `Column` | 垂直排列 | 整页竖排、表单 |
| `Row` | 水平排列 | 标题+图标、表单行 |
| `Box` | 叠放 | 背景图+前景文字、悬浮按钮 |

三者都**不处理滚动**（长列表用 LazyColumn；少量内容可配 `Modifier.verticalScroll`）。

```kotlin
// Column：子项按权重分配高度
Column(Modifier.height(200.dp)) {
    Text("固定高度", Modifier.height(40.dp))
    Box(Modifier.weight(1f).fillMaxWidth().background(Color.LightGray))  // 占满剩余空间
    Text("底部", Modifier.height(40.dp))
}

// Row：图标 + 标题，垂直居中
Row(
    modifier = Modifier.padding(16.dp),
    verticalAlignment = Alignment.CenterVertically,
    horizontalArrangement = Arrangement.spacedBy(8.dp),
) {
    Icon(painter = painterResource(Res.drawable.icon_home), contentDescription = null)
    Text("标题", style = MaterialTheme.typography.titleMedium)
}

// Box：叠放 + 子项单独对齐
Box(Modifier.fillMaxSize()) {
    Image(painter = bgPainter, contentDescription = null, Modifier.fillMaxSize())
    Text("叠加文字", Modifier.align(Alignment.BottomCenter))
}
```

---

## 六、常用组件

### 6.1 Text

```kotlin
// 跟随主题
Text("Hello, HarmonyOS",
    style = MaterialTheme.typography.titleLarge,
    color = MaterialTheme.colorScheme.onSurface)

// 单行截断省略号
Text(longString, maxLines = 1, overflow = TextOverflow.Ellipsis,
    modifier = Modifier.fillMaxWidth())
```

### 6.2 Button（Material / Material3）

```kotlin
// 主按钮 + 自定义颜色 + 禁用态
Button(
    onClick = { /* 提交 */ },
    enabled = formValid,
    colors = ButtonDefaults.buttonColors(
        backgroundColor = Color(0xFF4CAF50),
        contentColor = Color.White,
    ),
) { Text("确认") }

// Material3 变体
FilledTonalButton(onClick = { }) { Text("次要") }
OutlinedButton(onClick = { }) { Text("轮廓") }
TextButton(onClick = { }) { Text("文本") }
```

### 6.3 TextField / OutlinedTextField（表单输入）

```kotlin
var password by remember { mutableStateOf("") }

// 密码框：遮挡 + 密码键盘
OutlinedTextField(
    value = password,
    onValueChange = { password = it },
    label = { Text("密码") },
    singleLine = true,
    visualTransformation = PasswordVisualTransformation(),
    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
)

// 错误状态 + 辅助提示
OutlinedTextField(
    value = email,
    onValueChange = { email = it },
    label = { Text("邮箱") },
    isError = isError,
    supportingText = { if (isError) Text("格式不正确") },
)
```

### 6.4 Card

```kotlin
Card(
    onClick = { navController.navigate(DetailRoute(id)) },   // 传入 onClick 即可点击
    modifier = Modifier.fillMaxWidth().padding(8.dp),
    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
    shape = RoundedCornerShape(12.dp),
) {
    Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(painter = painterResource(Res.drawable.icon_info), contentDescription = null)
        Spacer(Modifier.width(12.dp))
        Text("点击进入详情")
    }
}
```

### 6.5 LazyColumn / LazyRow（长列表，性能关键）

与 `Column` 的区别：**只组合可见项**，数量多时更省性能。

```kotlin
data class Item(val id: String, val title: String)

LazyColumn(
    contentPadding = PaddingValues(16.dp),
    verticalArrangement = Arrangement.spacedBy(8.dp),
) {
    // key 用稳定唯一值（如 id），利于重组与复用
    items(items = itemList, key = { it.id }) { item ->
        Card(Modifier.fillMaxWidth()) {
            Text(item.title, Modifier.padding(12.dp))
        }
    }
}
```

### 6.6 导航：NavHost + 类型安全路由

依赖：`compose.navigation` + `kotlinx-serialization-json`（写在 commonMain，并启用 `kotlinSerialization` 插件）。

```kotlin
@Serializable data class HomeRoute(val unused: String = "home")
@Serializable data class DetailRoute(val demoId: String)

@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = HomeRoute()) {
        composable<HomeRoute> {
            Button(onClick = { navController.navigate(DetailRoute(demoId = "demo-1")) }) {
                Text("进入详情")
            }
        }
        composable<DetailRoute> { backStackEntry ->
            val route = backStackEntry.toRoute<DetailRoute>()
            BackHandler(onBack = { navController.popBackStack() })   // 鸿蒙上与 ArkTS onBackPressed 联动
            Text("详情: ${route.demoId}")
        }
    }
}
```

### 6.7 完整页面骨架：Scaffold + TopAppBar + BottomNavigation

```kotlin
var selected by remember { mutableStateOf(0) }

Scaffold(
    topBar = { TopAppBar(title = { Text("App") }) },
    bottomBar = {
        BottomNavigation {
            listOf("主页", "消息", "设置").forEachIndexed { index, label ->
                BottomNavigationItem(
                    selected = selected == index,
                    onClick = { selected = index },
                    icon = { Icon(painter = painterResource(iconResOf(index)), contentDescription = label) },
                    label = { Text(label) },
                )
            }
        }
    },
) { padding ->
    Box(Modifier.padding(padding)) {
        when (selected) {
            0 -> HomeScreen()
            1 -> MessageScreen()
            else -> SettingsScreen()
        }
    }
}
```

---

## 七、资源：图片、字符串、图标

- **资源目录**：`composeApp/src/commonMain/composeResources/`，下设 `drawable/`、`values/`、`font/` 等；
- **引用方式**：插件生成 `Res` 访问器（包名一般为 `<工程名>.composeapp.generated.resources`）：

```kotlin
Image(painterResource(Res.drawable.compose_multiplatform), null)   // 图片
Text(stringResource(Res.string.xxx))                               // 字符串
```

- 文件名中横杠自动转下划线：`icon-home.xml` → `Res.drawable.icon_home`；
- 执行 `publish*BinariesToHarmonyApp` 后，composeResources 自动复制到 `harmonyApp/entry` 的 rawfile 下，**无需手动拷贝**。

> **图标（重要）**：鸿蒙 CMP **不提供** `androidx.compose.material.icons`（`Icons.Default.*` 已废弃不可用）。请到 [Google Fonts Icons（Material Symbols）](https://fonts.google.com/icons) 下载矢量 XML 放入 `drawable/`，将 `android:fillColor` 设为 `#000000` 并删除 `android:tint` 等 Android 专属属性后使用。

---

## 八、渲染模式选型

鸿蒙上 CMP 支持两种渲染路径，按场景选择：

| 维度 | 自渲染（Skia Renderer） | 统一渲染（Fusion Renderer） |
| --- | --- | --- |
| 技术路径 | XComponent + Skia + OpenGL ES | ArkUI RenderNode + OHRender |
| 渲染引擎 | 自建管线 | 系统原生渲染管线 |
| 原生组件混排 | 三层 RootView 叠加方式 | RenderNode 层级**直接混排** |
| 构建产物 | 较大（含 Skia 库） | 较小 |
| 系统要求 | API 17+，OpenGL ES 3.0+ | API 19+（C-API 路径需 HarmonyOS 6.0.0.45+，低版本自动回退 JS 路径） |
| 适用场景 | 渲染性能极致、自定义绘制、多 Compose 实例 | 原生混排多（地图/视频/Web 嵌入）、平台一致性优先 |

通过 `gradle.properties` 的 `rendererBackend` 切换（`skia` / `fusion-renderer`），业务代码**不需要改动**。

---

## 九、鸿蒙平台差异与约束

写 UI 时不要把其他平台的交互/视觉表现默认到鸿蒙真机上：

1. **`KeyboardOptions.capitalization`**：自动大写策略在鸿蒙真机上可能与 iOS 不一致，不要仅凭它保证英文表单句首大写；
2. **`autoCorrectEnabled`**：鸿蒙缺少稳定对接的自动校正 API，英文纠错体验可能弱于 iOS；
3. **`FontFamily` 通用族**：`Serif` / `Monospace` / `Cursive` 等通用枚举在鸿蒙上可能映射到相近字体（系统字体族较少），需要明显对比时请**随应用打包字体**；
4. **生命周期**：壳工程必须实现完整的 `onPageShow()` 回调，否则页面返回后 ViewModel 状态可能丢失（见 CMP 渲染类 FAQ）；
5. **依赖 groupId**：统一使用 `org.jetbrains.androidx`，不要与 `androidx` 混用，否则编译报 Duplicate class。

---

## 十、编译与发布到鸿蒙

UI 写完后，产物进入鸿蒙壳工程的链路：

```bash
# 工程根目录执行
./gradlew publishDebugBinariesToHarmonyApp      # Debug
./gradlew publishReleaseBinariesToHarmonyApp    # Release
```

任务会自动完成：

1. 编译并链接 `libkn.so`；
2. 拷贝到 `harmonyApp/entry/libs/arm64-v8a/`（真机）与 `x86_64/`（模拟器）；
3. 拷贝头文件 `libkn_api.h` 到 `entry/src/main/cpp/include/`；
4. 拷贝 `commonMain/composeResources` 到 entry 的 rawfile。

之后在 DevEco Studio 中签名、打包 HAP、安装运行（见 [快速入门](快速入门.md) 第四、五节）。

> 若 Gradle 报 configuration-cache 锁占用，先执行 `./gradlew --stop` 再重试。

---

## 延伸阅读

| 文档 | 内容 |
| --- | --- |
| CMP 组件库用户手册 | 全部组件的属性表与完整示例 |
| CMP 自渲染用户手册 | 自渲染管线、接口与约束 |
| CMP 统一渲染用户手册 | 统一渲染配置与自渲染切换 |
| KMP&CMP Gradle 插件用户手册 | Gradle 插件与任务全量说明 |
| [Jetpack Compose 官方文档](https://developer.android.com/develop/ui/compose) | Compose 编程思想、状态管理、布局 |


内容由AI生成
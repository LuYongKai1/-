# 项目功能实现文档

本文件总结了项目中关键功能模块的实现方式，适合用于简历说明和面试讲解。

## 1. 动态路由与 RBAC 权限

### 相关文件
- `src/store/modules/route/index.ts`
- `src/router/guard/route.ts`
- `src/router/index.ts`

### 实现方式
- 采用 `Pinia` 管理路由状态，`routeStore` 维护 `constantRoutes`、`authRoutes`、`menus`、`cacheRoutes` 等。
- 支持两种路由模式：静态模式和动态模式。通过环境变量 `VITE_AUTH_ROUTE_MODE` 控制。
- 静态模式由 `createStaticRoutes()` 生成固定路由；动态模式调用后端接口 `fetchGetUserRoutes()` 获取用户可访问路由。
- 后端路由转换函数 `transformBackendRoutes()` 将后端路由树映射为前端路由属性：`name`、`path`、`component`、`meta.roles`、`meta.keepAlive`、`hideInMenu` 等。
- `handleConstantAndAuthRoutes()` 将常量路由与授权路由组合排序，生成 Vue Router 路由，并动态调用 `router.addRoute()` 注册。
- 路由守卫 `createRouteGuard()` 在 `beforeEach` 中处理：
  - 常量路由初始化、未登录重定向到登录页
  - 已登录路径权限检查（基于 `authStore.userInfo.roles`）
  - 登录页访问时跳转根页面
  - 权限不足时跳转 `403`
  - `404` 路径若存在权限则跳转 `403`，否则继续 404
- 通过 `routeStore.getIsAuthRouteExist()` 支持动态判断路由是否存在，兼容静态/动态模式。

### 适合面试讲的难点
- 设计后端路由树到前端组件路由的映射逻辑
- 处理路由初始化顺序，避免“未初始化时访问路由被 `not-found` 捕获”问题
- 角色权限过滤与动态菜单、面包屑同步
- 动态移除/重载路由、根路由重定向调整

## 2. IndexedDB 离线大 JSON 缓存与容错

### 相关文件
- `src/utils/indexedDB.ts`
- `src/hooks/business/useItemPackage.ts`
- `src/views/operate/datapackage/modules/file-management.vue`
- `src/views/viewOperation/gm_command/index.vue`

### 实现方式
- `openDatabase()` 打开名为 `JsonDataDB` 的 IndexedDB 数据库，创建 `jsonStorage` 对象存储空间。
- `storeJsonData(jsonString, version?)` 在存储前对 JSON 做严格校验：
  - 确保字符串非空
  - JSON 解析成功
  - 拒绝包含 `error`、`errMsg` 或 `code` 非正常值的数据
  - 拒绝空对象
- `getJsonData()` 读取缓存数据字段 `currentData`。
- `safeJsonParse()` 提供容错解析：当普通 `JSON.parse()` 失败时，尝试修复常见转义字符问题和 BOM 前缀。
- `clearJsonData()` 清理缓存数据。
- `useItemPackage()` 负责获取数据包并实现版本缓存策略：
  - 先获取当前版本号 `fetchGetPackageVersion()`
  - 若本地缓存版本一致，则直接返回缓存数据
  - 否则调用 `fetchGetDataPackage()` 获取新数据
  - 数据获取后存储到 IndexedDB 供后续离线使用
  - 失败时降级读取旧缓存
- 该机制保证大数据包在离线/网络异常时仍可使用，并避免错误响应覆盖缓存。

### 适合面试讲的难点
- 如何实现大 JSON 数据包的离线持久化与版本检测
- 如何防止错误数据写入缓存
- 如何设计容错解析，避免因格式异常导致全量失败
- 如何在数据更新时间差异时优雅回退到旧缓存

## 3. GM 命令控制台功能

### 相关文件
- `src/views/viewOperation/gm_command/index.vue`

### 实现方式
- 页面组合了多种功能模块：服务器选择、GM 指令模板、JSON 编辑、命令执行、历史记录、统计概览。
- 使用 `serverStore` 获取跨服区服列表，并提供树形选择。
- `gmTemplates` 预定义指令模板，包含默认参数结构，便于快速生成命令。
- `loadGmHistory()` 和 `loadStatistics()` 分别调用后端接口：
  - `fetchRecentGmHistory()` 加载最近执行历史
  - `fetchGmCommandStatistics()` 加载命令执行统计
- 历史记录处理逻辑：
  - 支持 `commandJson` 字符串解析
  - 兼容 `commandData` 字段
  - 使用 `JSONbig` 解析大整数或 JSON 字符串
  - 将执行状态映射为 success/failure，用于 UI 展示
- 页面支持防抖执行、执行结果展示、命令模板切换等。

### 适合面试讲的难点
- 批量 GM 命令执行场景下，如何设计模板化指令与参数输入
- 如何保证命令历史和统计数据可视化
- 如何处理大 JSON / 大整数命令参数解析

## 4. 数据包与文件管理页面

### 相关文件
- `src/views/operate/datapackage/index.vue`
- `src/views/operate/datapackage/modules/file-management.vue`

### 实现方式
- `operate/datapackage/index.vue` 分为两个 Tab：数据包列表与文件管理。
- 数据包页面展示当前版本并支持一键更新：调用 `fetchUpdateDataPackage()` 实现更新操作。
- file-management 组件实现了文件浏览与上传：
  - `fetchCurrentFile()` 获取当前目录文件列表
  - 支持目录点击进入和面包屑导航
  - 支持 ZIP 文件上传，前置校验文件类型与大小
  - 上传后刷新目录列表
- 采用 `useTable()` 钩子管理表格列、分页、数据加载和表头操作按钮。

### 适合面试讲的难点
- 构建分层文件管理 UI（目录导航 + 文件列表）
- 上传限制与用户提示的可用性设计
- 数据包版本获取与更新流程

## 5. 监控与高频数据功能

### 相关区域
- `src/views/monitor/*`
- 相关业务页面在 `src/views/*` 目录

### 实现方式
- 监控模块包含聊天监控、在线监控、作业监控、资源监控、服务日志等页面。
- 页面一般使用表格和图表展现高频更新数据。
- 由于这类页面对刷新频率和渲染稳定性要求高，通常需要增加节流、差分更新或分页策略。

### 适合面试讲的难点
- 高频数据刷新的前端节流与性能优化
- 多表格/仪表盘页面的状态管理与数据一致性
- 大量监控数据展示时的用户体验保障

## 6. 额外补充：统一请求与会话保护（源码关联）

### 相关文件
- `src/service/request/index.ts`
- `src/service/request/shared.ts`
- `src/service-alova/request/index.ts`

### 实现方式
- 统一请求层封装 Axios 与 Alova，支持：
  - token 注入
  - refresh token 逻辑
  - 后端成功判定与失败分类
  - 全局错误弹窗去重
  - 401/403 处理、登录过期、账号被踢
- `shared.ts` 中 `handleRefreshToken()` 通过 `fetchRefreshToken()` 实现并发刷新防抖，避免重复刷新请求。

### 适合面试讲的难点
- 并发请求下的 token 刷新与重试机制
- 错误弹窗防重复与会话保护逻辑
- 不同请求库之间的统一处理方案

---

## 建议写简历方式
可将上述功能按“模块 + 实现方式 + 难点”组合成 3-5 条简历项，例如：

- 负责后台管理系统核心模块开发，包含动态路由 & RBAC 权限、GM 运维工具、数据包管理、监控面板与离线大 JSON 缓存。
- 实现了后端路由树到前端动态路由映射、角色权限过滤、菜单同步与 403/404 容错机制。
- 使用 IndexedDB 持久化大 JSON 数据包，支持版本检测、错误响应拒绝与容错 JSON 解析。
- 构建 GM 命令控制台，支持多服批量执行、模板化 JSON 指令、历史记录与统计分析。X@
- 实现数据包文件管理与 ZIP 上传，提供文件目录浏览、路径导航、上传校验与状态刷新。

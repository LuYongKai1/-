<div align="center">
	<img src="./public/favicon.svg" width="160" />
	<h1>SoybeanAdmin</h1>
  <span>中文 | <a href="./README.en_US.md">English</a></span>
</div>

---

[![license](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![github stars](https://img.shields.io/github/stars/honghuangdc/soybean-admin)](https://github.com/soybeanjs/soybean-admin)
[![github forks](https://img.shields.io/github/forks/honghuangdc/soybean-admin)](https://github.com/soybeanjs/soybean-admin)
[![gitee stars](https://gitee.com/honghuangdc/soybean-admin/badge/star.svg)](https://gitee.com/honghuangdc/soybean-admin)

<a href="https://hellogithub.com/repository/1298f27d5fe54959a16cf9686516ddb3" target="_blank"><img src="https://abroad.hellogithub.com/v1/widgets/recommend.svg?rid=1298f27d5fe54959a16cf9686516ddb3&claim_uid=IiDXWmP4TEntjbV" alt="Featured｜HelloGitHub" style="width: 250px; height: 54px;" width="250" height="54" /></a>


## 简介

[`SoybeanAdmin`](https://github.com/soybeanjs/soybean-admin) 是一个清新优雅、高颜值且功能强大的后台管理模板，基于最新的前端技术栈，包括 Vue3, Vite5, TypeScript, Pinia 和 UnoCSS。它内置了丰富的主题配置和组件，代码规范严谨，实现了自动化的文件路由系统。此外，它还采用了基于 ApiFox 的在线Mock数据方案。`SoybeanAdmin` 为您提供了一站式的后台管理解决方案，无需额外配置，开箱即用。同样是一个快速学习前沿技术的最佳实践。

## 特性
- **前沿技术应用**：采用 Vue3, Vite5, TypeScript, Pinia 和 UnoCSS 等最新流行的技术栈。
- **清晰的项目架构**：采用 pnpm monorepo 架构，结构清晰，优雅易懂。
- **严格的代码规范**：遵循 [SoybeanJS 规范](https://docs.soybeanjs.cn/zh/standard)，集成了eslint, prettier 和 simple-git-hooks，保证代码的规范性。
- **TypeScript**： 支持严格的类型检查，提高代码的可维护性。
- **丰富的主题配置**：内置多样的主题配置，与 UnoCSS 完美结合。
- **内置国际化方案**：轻松实现多语言支持。
- **自动化文件路由系统**：自动生成路由导入、声明和类型。更多细节请查看 [Elegant Router](https://github.com/soybeanjs/elegant-router)。
- **灵活的权限路由**：同时支持前端静态路由和后端动态路由。
- **丰富的页面组件**：内置多样页面和组件，包括403、404、500页面，以及布局组件、标签组件、主题配置组件等。
- **命令行工具**：内置高效的命令行工具，git提交、删除文件、发布等。
- **移动端适配**：完美支持移动端，实现自适应布局。

## 📦 技术栈

- ⚡️ [Vue 3](https://vuejs.org/)
- 🚀 [Vite 5](https://vitejs.dev/)
- 🎨 [Naive UI](https://www.naiveui.com/)
- 💅 [UnoCSS](https://unocss.dev/)
- 📦 [Pinia](https://pinia.vuejs.org/)
- 🌍 [Vue I18n](https://vue-i18n.intlify.dev/)
- 💻 TypeScript 全量支持
- 🔧 多环境配置支持：`test` / `prod` / `production` / `intranet`

## 📁 项目结构
├── public/ # 静态资源目录
├── src/ # 项目源码
│ ├── assets/ # 静态资源
│ ├── components/ # 全局组件
│ ├── layouts/ # 页面布局
│ ├── router/ # 路由配置
│ ├── store/ # Pinia 状态管理
│ ├── views/ # 页面视图
│ └── main.ts # 应用入口
├── vite.config.ts # Vite 配置
├── tsconfig.json # TypeScript 配置
└── package.json # 项目信息


**环境准备**

确保你的环境满足以下要求：

- **git**: 你需要git来克隆和管理项目版本。
- **NodeJS**: >=18.12.0，推荐 18.19.0 或更高。
- **pnpm**: >= 8.7.0，推荐 8.14.0 或更高。

**克隆项目**


**安装依赖**

```bash
pnpm i
```
> 由于本项目采用了 pnpm monorepo 的管理方式，因此请不要使用 npm 或 yarn 来安装依赖。

**启动项目**

```bash
pnpm dev              # 默认 test 模式  本地环境
pnpm dev:prod-dev        # 启动 prod-dev 启动线上环境
pnpm dev:production   # 启动 production 阿里云环境
pnpm dev:intranet     # 启动内网模式
```

**构建项目**

```bash
pnpm build            # 默认 线上 模式  线上环境
pnpm build:test         # 默认 test 模式  本地环境
pnpm build:production # 启动 production 阿里云环境
pnpm build:intrane    # 启动内网模式
```

.env.pord-dev 配置文件，是本地启动线上环境的配置文件，用于本地调试线上环境  执行命令：pnpm run dev:prod-dev
.emv.prod-online 配置文件，是打包线上环境时所用，执行命令：pnpm run build
原因：因为.env.prod-dev 中设置了VITE_SERVICE_BASE_URL="http://115.190.72.251:8080"
本地运行时，Vite 使用的是 localhost，并不会自动代理 /api 到后端；
所以需要写成完整地址，才能绕过跨域问题或避免 404；
所以需要创建一个.env.prod-online，不需要设置VITE_SERVICE_BASE_URL，因为是由nginx代理的，所以直接写 /api 即可。

**本地预览**

```bash
pnpm preview
```

**常用脚本**
| 命令               | 说明               |
| ---------------- | ---------------- |
| `pnpm lint`      | 格式化并修复代码         |
| `pnpm typecheck` | 类型检查             |
| `pnpm gen-route` | 自动生成路由配置         |
| `pnpm cleanup`   | 清理构建产物           |
| `pnpm release`   | 发布版本             |
| `pnpm commit`    | 使用 commitizen 提交 |
|                  |                  |

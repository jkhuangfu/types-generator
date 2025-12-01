# OpenAPI TypeScript 类型生成器

一个基于 Node.js 的轻量级工具，能够将 OpenAPI/Swagger 规范自动转换为 TypeScript 类型定义文件（.d.ts）。提供 Web 界面和 API 接口，支持 OpenAPI 2.0 和 3.0+ 规范。

- **[main 分支 - Node.js 服务版本](https://github.com/jkhuangfu/types-generator)** （当前）
- **[chrome 分支 - 浏览器插件版本](https://github.com/jkhuangfu/types-generator/tree/chrome)**

## 🚀 快速开始

### 环境要求

- Node.js 18.0 或更高版本
- 支持 `fetch` API 的运行环境

### 安装和运行

```bash
# 克隆或下载项目
cd types-generator

# 启动服务
node index.js
```

服务启动后，访问 `http://localhost:9999` 即可使用 Web 界面。

## 📖 使用方法

### Web 界面使用

1. 在 **openapi json 地址** 输入框中填入 OpenAPI 规范的 JSON 地址
2. 在 **请求路径** 输入框中填入需要生成类型的 API 路径（多个路径用英文逗号分隔）
3. 点击 **请求并展示 d.ts** 按钮
4. 查看生成的 TypeScript 类型定义
5. 使用 **复制** 或 **下载 .d.ts** 按钮获取代码

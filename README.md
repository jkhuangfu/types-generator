# OpenAPI Type Generator

从 OpenAPI 文档生成 TypeScript 类型定义的工具，支持多种使用方式。

## 🌟 版本分支

- **[main 分支 - Node.js 服务版本](https://github.com/jkhuangfu/types-generator)**
- **[chrome 分支 - 浏览器插件版本](https://github.com/jkhuangfu/types-generator/tree/chrome)**（当前）

---

## Chrome 插件版本说明

这是一个 Chrome 浏览器插件，可以从 OpenAPI 文档生成 TypeScript 类型定义。

## 功能特点

- 🚀 从 OpenAPI JSON 文档自动生成 TypeScript 类型定义
- 📋 一键复制生成的类型定义
- 💾 下载生成的类型定义文件
- 🔍 支持自定义 API 路径
- 🎨 语法高亮显示
- 🔒 本地处理，无需上传数据到服务器

## 安装方法

### 开发者模式安装

1. 下载或克隆本项目到本地
2. 打开 Chrome 浏览器，输入 `chrome://extensions/` 进入扩展程序页面
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目根目录（包含 `manifest.json` 的目录）
6. 安装完成后，浏览器右上角会出现插件图标

## 使用方法

1. **打开插件**：点击浏览器右上角的插件图标，或右键点击图标选择"OpenAPI Type Generator"
2. **输入 OpenAPI 地址**：在"OpenAPI JSON 地址"输入框中粘贴 OpenAPI 文档的 URL
   - 例如：`https://petstore.swagger.io/v2/swagger.json`
3. **输入 API 路径**（可选）：在"API 路径"输入框中指定特定的 API 路径
   - 例如：`/pet` 或留空以生成所有类型
4. **生成类型**：点击"生成 TypeScript"按钮
5. **查看结果**：生成的 TypeScript 类型定义会显示在下方区域
6. **复制或下载**：
   - 点击"复制"按钮将类型定义复制到剪贴板
   - 点击"下载"按钮将类型定义保存为 `.ts` 文件

# 图寻 AI 助手

Chrome Manifest V3 浏览器插件 MVP，用于 GeoGuessr / 图寻类街景定位训练。插件只截取当前可见画面，调用用户自己配置的 OpenAI-compatible 多模态 API，并把复盘案例和学习规则保存在浏览器本地 IndexedDB。

## 边界

- 不读取隐藏答案、隐藏坐标、页面变量、游戏接口或网络元数据。
- 不自动点击、不自动提交答案、不操作游戏页面。
- 不使用自有服务器。
- API Key 由用户在设置页输入，只保存在本地。
- MVP 不保存截图图片，只保存截图 hash、AI 结果、正确答案、纠错说明、标签和经验规则。

## 安装依赖

推荐环境：

- Node.js `24.14.1`，见 `.nvmrc`
- npm `>=10`
- Git
- GitHub CLI `gh`，用于提交和 PR 流程

```bash
npm install
```

也可以一键检查机器环境：

```bash
npm run setup:machine
```

## 本地开发

```bash
npm run dev
```

Vite dev server 主要用于 UI 调试。`chrome.tabs.captureVisibleTab` 等扩展 API 需要加载构建后的插件才可用。

## 打包插件

```bash
npm run build
```

打包结果在 `dist/`。

## Chrome 加载插件

1. 打开 `chrome://extensions`。
2. 打开右上角“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择项目里的 `dist/` 文件夹。
5. 建议把“图寻 AI 助手”固定到浏览器工具栏。

也可以用独立 Chrome 配置启动：

```bash
npm run open:extension
```

## 配置 Qwen3-VL Flash

打开插件设置页，填写：

- API Base URL，例如 `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
- API Key
- Model Name，例如 `qwen3-vl-flash`
- 请求超时、图片质量、历史经验检索、调试日志

设置页提供 Qwen 新加坡、北京、美国三个预设。插件会请求：

```text
{API Base URL}/chat/completions
```

请求格式兼容 OpenAI chat completions，消息里包含文本 prompt 和当前截图的 `image_url` data URL。

## 使用方法

1. 打开 GeoGuessr / 图寻类街景页面。
2. 点击浏览器工具栏里的插件图标。
3. 选择“快速”或“精准”。
4. 点击“分析当前街景”。
5. 查看 Popup 或网页右侧浮窗的判断结果。
6. 本局结束后点击醒目的“学习反馈 / 复盘本局”。
7. 输入正确国家/地区、纠错说明和标签。
8. 插件会保存案例，并调用模型总结最多 3 条本地经验规则。

## 速度策略

- 快速模式：最长边压缩到 `640px`，不加入历史规则，减少 prompt 和输出 token，目标 2-5 秒。
- 精准模式：最长边压缩到 `1024px`，加入最近的通用学习规则，目标 5-10 秒。
- 默认图片质量为 `0.72`。
- 请求超时后 UI 会显示错误，不会卡死。

## 上一张图污染的处理

每次分析都被视为独立新题。当前实现不会把上一张图的 AI 预测国家用于下一张图的检索或 prompt。

- 快速模式完全跳过历史规则，优先保证速度和独立性。
- 精准模式只读取最近的通用 `LearnedRule`，不会读取 `lastAnalysis` 的国家候选。
- Prompt 明确要求模型不要延续上一局或上一张截图的判断。

## 本地学习

MVP 不训练大模型，只做本地案例存储和检索增强：

- `GameCase` 保存复盘案例，不保存截图内容。
- `LearnedRule` 保存用户纠错后总结出的短规则。
- 设置页的“本地资料库”可以查看、编辑、删除规则，导入/导出规则，导出/恢复完整备份。
- `embeddingSearch()` 已预留，未来可接入向量检索。

## 常用脚本

```bash
npm run test
npm run typecheck
npm run build
npm run validate:extension
npm run open:extension
```

## 当前仍需手动验证

- 在 Chrome 里加载 `dist/`，检查 Popup、设置页和右侧浮窗视觉效果。
- 填入真实 DashScope API Key，测试 `qwen3-vl-flash` 的真实响应速度和 JSON 稳定性。
- 如果需要 GitHub CLI PR 流程，需要先执行 `gh auth login`。

远程仓库：

- `origin`: `https://github.com/xiaoblackmi/ANTI-TuXunAI.git`

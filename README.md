# 图寻 AI 助手

Chrome Manifest V3 浏览器插件 MVP，用于 GeoGuessr / 图寻类街景定位训练。插件只截取当前可见画面，快模式使用 Hugging Face 上的 StreetCLIP 做零样本国家粗筛，精准模式使用用户自己配置的 Qwen3-VL Flash。

## 边界

- 不读取隐藏答案、隐藏坐标、页面变量、游戏接口或网络元数据。
- 不自动点击、不自动提交答案、不操作游戏页面。
- 不使用自有服务器。
- API Key 由用户自己输入，只保存在本地。
- 复盘案例不保存截图图片，只保存截图 hash、AI 结果、正确答案、纠错说明、标签和经验规则。

## 安装

```bash
npm install
```

推荐环境：

- Node.js `24.14.1`
- npm `>=10`
- Git

可先跑机器检查：

```bash
npm run setup:machine
```

## 本地开发

```bash
npm run dev
```

## 打包

```bash
npm run build
```

打包结果在 `dist/`。

## Chrome 加载

1. 打开 `chrome://extensions`
2. 开启“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择 `dist/`

## 配置

打开插件设置页，分两块配置：

- `Qwen 精准模式`
  - API Base URL
  - API Key
  - Model Name，默认 `qwen3-vl-flash`
- `StreetCLIP 快速模式`
  - Hugging Face Router URL，默认 `https://router.huggingface.co/hf-inference/models/geolocal/StreetCLIP`
  - Hugging Face Token
  - StreetCLIP 模型名，默认 `geolocal/StreetCLIP`

插件会调用：

- Qwen 精准模式：`{API Base URL}/chat/completions`
- StreetCLIP 快速模式：Hugging Face Inference API

## 使用

1. 打开 GeoGuessr / 图寻类街景页面
2. 点击插件图标
3. 选择 `StreetCLIP 快速` 或 `Qwen 精准`
4. 点击 `分析当前街景`
5. 查看 Popup 或右侧浮窗
6. 本局结束后点击 `学习反馈 / 复盘本局`
7. 填写正确国家、纠错说明和标签

## 速度策略

- 快速模式压缩到 `640px` 最长边，使用 StreetCLIP 零样本国家排序，不走千问
- 精准模式压缩到 `1024px` 最长边，使用 Qwen3-VL Flash 和本地经验规则
- 默认图片质量为 `0.72`

## 本地学习

- `GameCase` 保存复盘案例，不保存截图图片
- `LearnedRule` 保存用户纠错后总结出的短规则
- 设置页的本地资料库可以查看、编辑、删除规则，导入导出规则，导出恢复完整备份

## 验证

```bash
npm run typecheck
npm run test
npm run build
npm run validate:extension
```

如果要继续走 GitHub PR 流程，可以把当前分支推到远端后创建 PR。

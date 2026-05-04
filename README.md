# GeoGuessr AI Assistant

Chrome Manifest V3 browser extension MVP for personal street-view observation training. It captures only the currently visible tab image, sends that screenshot to a user-configured OpenAI-compatible vision API, and stores review notes plus learned rules locally in IndexedDB.

## Boundaries

- Does not read hidden answers, coordinates, page internals, game APIs, or network metadata.
- Does not click, guess, submit, or automate gameplay.
- Does not use a custom server.
- API keys are entered by the user and stored locally in IndexedDB.
- Review cases do not store screenshots in this MVP. Only a screenshot hash is saved.

## Machine Setup

Recommended local setup:

- Node.js `24.14.1` from `.nvmrc`
- npm `>=10`
- Git
- GitHub CLI (`gh`) for push and PR workflows

Bootstrap this machine with:

```bash
npm run setup:machine
```

This installs dependencies, runs `typecheck`, runs tests, runs a production build, and checks whether GitHub CLI is available.

## Install

```bash
npm install
```

## Local Development

```bash
npm run dev
```

Vite dev server is useful for UI iteration, but Chrome extension APIs such as `tabs.captureVisibleTab` only work after loading the built extension.

## Build

```bash
npm run build
```

The unpacked extension is generated in `dist/`.

## Load In Chrome

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the `dist/` folder.
5. Pin `GeoGuessr AI Assistant` if desired.

## Configure API

Open the extension Options page and set:

- API Base URL, for example `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
- API Key
- Model Name, for example `qwen3-vl-flash`
- Timeout, image quality, history retrieval, and debug settings

Use `Test API` in Options to verify that the configured provider can return parseable JSON before trying a screenshot analysis.

The client calls:

```text
{API Base URL}/chat/completions
```

The request uses OpenAI-compatible chat completions with a text prompt and `image_url` data URL.

### Qwen3-VL Flash

The default MVP settings target Alibaba Cloud Model Studio / DashScope:

- Singapore: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` with `qwen3-vl-flash`
- Beijing: `https://dashscope.aliyuncs.com/compatible-mode/v1` with `qwen3-vl-flash`
- Virginia: `https://dashscope-us.aliyuncs.com/compatible-mode/v1` with `qwen3-vl-flash-us`

Alibaba Cloud documents Qwen-VL as OpenAI-compatible and lists `qwen3-vl-flash` among supported vision models:

- https://www.alibabacloud.com/help/en/model-studio/qwen-vl-compatible-with-openai
- https://docs.qwencloud.com/developer-guides/getting-started/vision-models

## Usage

1. Open a GeoGuessr or similar street-view page.
2. Click the extension icon.
3. Choose Fast Mode or Detailed Mode.
4. Click Analyze Current Street View.
5. Review the popup result or right-side floating panel.
6. After the round ends, click Review This Round.
7. Enter the correct answer, correction note, and tags.
8. The extension saves the case locally and asks the model to summarize reusable learned rules.

## Modes

- Fast Mode: compresses the screenshot to 768px longest side, asks for compact JSON, target 2-5 seconds.
- Detailed Mode: compresses to 1280px longest side, includes more local learned rules, target 5-10 seconds.

## Local Learning

This MVP does not train a model. It implements local continuous learning through retrieval-augmented prompting:

- `GameCase` stores round feedback.
- `LearnedRule` stores short reusable correction rules.
- Future analysis reads the most recent or most relevant rules and includes them in the prompt.
- The Options page includes a Local Library for viewing cases and learned rules, editing/deleting rules, marking cases useful, and importing/exporting rules as JSON.
- `embeddingSearch()` is reserved for future vector search integration.

Detailed Mode uses the previous analysis, when available, to retrieve more relevant learned rules by country, clue type, and extracted keywords.

## Current Status

Implemented:

- MV3 extension scaffold with Popup, Options, service worker, and injected floating panel.
- Visible-tab screenshot capture, canvas compression, and screenshot hashing.
- OpenAI-compatible vision calls with Qwen3-VL Flash defaults and DashScope presets.
- Timeout handling, strict JSON parsing, and fallback parsing for fenced or surrounded JSON.
- Local IndexedDB settings, cases, learned rules, and review learning flow.
- Local Library management for cases and learned rules.
- Learned-rule import/export.
- API smoke test from Options.
- Tests for JSON parsing, prompt rule injection, rule ranking, and query extraction.

Still manual:

- Loading `dist/` in Chrome and checking the extension UI visually.
- Providing a real DashScope API key for live API verification.
- Authenticating GitHub CLI with `gh auth login` if CLI PR workflows are needed.

## Scripts

```bash
npm run setup:machine
npm run test
npm run typecheck
npm run build
```

## Notes

Because the API endpoint is user-configurable, the extension declares broad host permissions so it can call OpenAI-compatible providers directly from the browser extension context.

Remote repository for this working copy:

- `origin`: `https://github.com/xiaoblackmi/ANTI-TuXunAI.git`

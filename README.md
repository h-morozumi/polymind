# polymind

Desktop client for chat-based and agent-based AI experiences. Built with Electron for Windows and macOS.

## Features

- **Multi-provider LLM support** — OpenAI, Azure OpenAI, Anthropic Claude, Google Gemini, xAI Grok, Ollama, and OpenAI-compatible endpoints
- **Streaming chat** — Real-time token streaming via Vercel AI SDK
- **Web search** — Provider-native web search toggle (OpenAI, Azure OpenAI, Gemini, Claude, Grok)
- **X (Twitter) search** — Grok models can search X posts in real-time
- **Rich rendering** — Markdown (GFM), syntax highlighting, and Mermaid diagrams
- **Azure Entra ID authentication** — Token-based auth with persistent cache for Azure OpenAI
- **Provider management** — Add, configure, and switch between multiple LLM providers and models
- **External links** — URLs in responses open in the system browser

## Tech Stack

Electron · electron-vite · React 19 · TypeScript · Tailwind CSS v4 · Vitest · pnpm

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)

## Setup

```bash
pnpm install
```

## Development

```bash
pnpm dev        # Launch Electron with hot reload
pnpm build      # Production build
pnpm start      # Preview production build
pnpm test       # Run tests
pnpm lint       # ESLint + Prettier check
pnpm format     # Auto-format with Prettier
```

## Project Structure

```
src/
  main/        # Electron main process — app lifecycle, IPC handlers, LLM services
  preload/     # Preload scripts — contextBridge API for renderer
  renderer/    # React frontend — chat UI, settings, components
  shared/      # Shared types, IPC channel definitions, and constants
```

## Web Search Support

| Provider | Search | Notes |
|---|---|---|
| OpenAI | Web | `openai.tools.webSearch` |
| Azure OpenAI | Web | Responses API models only |
| Google Gemini | Google Search | `google.tools.googleSearch` |
| Anthropic Claude | Web | `anthropic.tools.webSearch` |
| xAI Grok | Web + X | Model auto-selects search type |

## License

[MIT](LICENSE)

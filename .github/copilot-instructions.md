# Copilot Instructions for polymind

## Language

Think and reason in English. Respond to the user in Japanese.

## Project Overview

polymind is a cross-platform desktop client (Windows/macOS) providing chat-based and agent-based AI experiences, similar to Microsoft 365 Copilot. It is designed to support extensible multi-agent workflows and external tool/API integrations.

## Tech Stack

- **Desktop shell**: Electron (electron-vite for build/dev)
- **Frontend UI**: React 19
- **Language**: TypeScript (strict mode, preferred for all new code)
- **Styling**: Tailwind CSS v4
- **Package manager**: pnpm
- **Testing**: Vitest
- **Linting**: ESLint (flat config) + Prettier

## Architecture

The codebase follows Electron's process model with clear separation:

```
src/
  main/        # Electron main process (Node.js) — app lifecycle, IPC handlers, native APIs
  preload/     # Preload scripts — contextBridge to expose safe APIs to renderer
  renderer/    # React frontend (browser context) — UI components, state management
  shared/      # Types, constants, and utilities shared across all processes
```

- Main ↔ Renderer communication uses Electron IPC with typed channels defined in `shared/ipc.ts`.
- The renderer process must never directly access Node.js APIs; use preload scripts (`contextBridge`) to expose safe bridges.
- Agent orchestration and tool integration logic lives in the main process.
- Path aliases are configured: `@main/*`, `@preload/*`, `@renderer/*`, `@shared/*`.

## Build, Test, and Lint

```bash
pnpm install          # Install dependencies
pnpm dev              # Development with hot reload
pnpm build            # Production build (electron-vite build)
pnpm test             # Run all tests (Vitest)
pnpm test -- src/shared/__tests__/ipc.test.ts   # Run a single test file
pnpm lint             # ESLint + Prettier check
pnpm format           # Auto-format with Prettier
```

## Conventions

- **IPC channels**: Define channel names as string literal types in `shared/ipc.ts`. Both main and renderer must reference these types — never use raw strings for IPC channel names.
- **Preload API**: Define the API shape in `src/preload/index.ts` and export the type (`ElectronApi`). Declare `window.api` in `src/renderer/env.d.ts`.
- **Component structure**: One React component per file. Colocate component-specific styles and tests alongside the component file.
- **State management**: Keep local state in React; use IPC to fetch data from the main process. Avoid duplicating state across processes.
- **Imports**: Use path aliases (`@shared/`, `@main/`, `@renderer/`, `@preload/`) rather than deep relative paths.
- **Error handling**: Wrap IPC calls in try/catch on both sides. Surface errors to the user with clear messages.

## Design Principles

- Prefer practical, working implementations over premature abstraction.
- Keep the architecture simple in early stages — add complexity only when needed.
- Structure code so agent orchestration and tool integrations can be added incrementally without large refactors.

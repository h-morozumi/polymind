# AGENTS.md

Agent context for AI coding assistants (Codex, Claude Code, Copilot, etc.).
This file is read automatically at session start.

## Project Overview

polymind is a cross-platform desktop client (Windows/macOS) providing chat-based and agent-based AI experiences. It supports extensible multi-agent workflows and external tool/API integrations.

**Primary language:** TypeScript (strict mode)
**Desktop shell:** Electron (electron-vite)
**Frontend:** React 19 + Tailwind CSS v4
**Package manager:** pnpm
**Testing:** Vitest
**Linting:** ESLint (flat config) + Prettier

## Build, Test, and Lint

```bash
pnpm install                                    # Install dependencies
pnpm dev                                        # Dev server with hot reload
pnpm build                                      # Production build (electron-vite)
pnpm test                                       # Run all tests
pnpm test -- src/shared/__tests__/ipc.test.ts   # Run a single test file
pnpm lint                                       # ESLint + Prettier check
pnpm format                                     # Auto-format with Prettier
```

## Directory Structure

```
src/
  main/        # Electron main process (Node.js) — app lifecycle, IPC handlers, native APIs
  preload/     # Preload scripts — contextBridge to expose safe APIs to renderer
  renderer/    # React frontend (browser context) — UI components, state management
  shared/      # Types, constants, and utilities shared across all processes
```

Path aliases: `@main/*`, `@preload/*`, `@renderer/*`, `@shared/*`

## Architecture Rules

- Main ↔ Renderer communication uses Electron IPC with typed channels defined in `shared/ipc.ts`.
- The renderer process must **never** directly access Node.js APIs; use preload scripts (`contextBridge`).
- Agent orchestration and tool integration logic lives in the main process.

## Code Conventions

- **IPC channels**: Define channel names as string literal types in `shared/ipc.ts`. Never use raw strings for IPC channel names.
- **Preload API**: Define the API shape in `src/preload/index.ts` and export the type (`ElectronApi`). Declare `window.api` in `src/renderer/env.d.ts`.
- **Components**: One React component per file. Colocate styles and tests alongside the component.
- **State**: Keep local state in React; use IPC for main process data. No duplicated state across processes.
- **Imports**: Use path aliases (`@shared/`, `@main/`, `@renderer/`, `@preload/`) over deep relative paths.
- **Error handling**: Wrap IPC calls in try/catch on both sides. Surface errors with clear messages.

## Design Principles

- Prefer practical, working implementations over premature abstraction.
- Keep the architecture simple — add complexity only when needed.
- Structure code so agent orchestration and tool integrations can be added incrementally.

## Commit Conventions

- Use conventional commit prefixes: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`
- Write commit messages in English.

## Approval Gates

Before marking a task complete:

- Tests pass: `pnpm test`
- Lint clean: `pnpm lint`
- No unintended files modified
- New code has corresponding tests where appropriate

## Anti-Patterns

- Do not commit secrets or API keys.
- Do not access Node.js APIs directly from the renderer process.
- Do not use raw strings for IPC channel names — always reference `shared/ipc.ts`.
- Do not add unnecessary dependencies without justification.

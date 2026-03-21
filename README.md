# polymind

Cross-platform desktop client for chat-based and agent-based AI experiences.

## Tech Stack

Electron · React · TypeScript · Tailwind CSS · pnpm

## Setup

```bash
pnpm install
```

## Development

```bash
pnpm dev        # Launch Electron with hot reload
pnpm build      # Production build
pnpm test       # Run tests
pnpm lint       # ESLint + Prettier check
pnpm format     # Auto-format with Prettier
```

## Project Structure

```
src/
  main/        # Electron main process
  preload/     # Preload scripts (contextBridge)
  renderer/    # React frontend
  shared/      # Shared types and constants
```

## License

[MIT](LICENSE)

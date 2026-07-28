# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**flowcloudai-ui-monorepo** is a React component library monorepo with an integrated playground/demo app. It's designed to build a reusable UI component library consumed both internally and as an npm package.

### Structure

```
flowcloudai-ui-monorepo/
├── ui/                 # Component library (published to npm as flowcloudai-ui)
│   ├── src/
│   │   ├── components/ # All UI components organized by type (Button, Tree, etc.)
│   │   ├── ThemeProvider.tsx
│   │   └── style/
│   ├── package.json    # Main library exports: ESM, CJS, types, CSS
│   └── tsup.config.ts  # tsup build config for library
├── app/                # Vite-based demo playground (shows all components)
│   ├── src/
│   │   ├── demos/      # One demo file per component
│   │   └── App.tsx
│   └── package.json    # Local dependency uses install-local to link ui/
└── vite.config.ts      # Root Vite config (Tauri integration present)
```

## Key Commands

### UI Library Development

**Build the library** (outputs to `ui/dist/`):
```bash
cd ui && npm run build
```

**Develop the app** (watches ui and app together):
```bash
cd app && npm run dev
```
This starts a Vite dev server at http://localhost:5173, which automatically rebuilds components as you edit them.

**Setup after cloning** (installs dependencies and links local ui package):
```bash
cd app && npm run install:local
```

### Testing & Quality

**Lint TypeScript and React code**:
```bash
npx eslint . --max-warnings 0
```

### Common Workflows

- **Add a new component**: Create `ui/src/components/ComponentName/ComponentName.tsx`, export it in `ui/src/index.ts`, then create a demo at `app/src/demos/ComponentNameDemo.tsx`
- **Edit existing component**: Changes in `ui/src/components/` are picked up instantly in the dev server
- **Update styles**: Modify CSS files in `ui/src/style/index.css` or component-specific CSS

## Architecture & Important Patterns

### UI Library (`ui/`)

**Export Strategy**: All components are exported from `ui/src/index.ts` for public consumption. This is the single entry point for the library.

**Build Output**: Uses tsup to generate:
- ESM (`dist/index.js`) — modern bundlers
- CJS (`dist/index.cjs`) — CommonJS for compatibility
- Types (`dist/index.d.ts`) — TypeScript definitions
- Styles (`dist/index.css`) — consumers must manually import styles

**Styling**: CSS is NOT injected into components; consumers must import `flowcloudai-ui/style` or `flowcloudai-ui/dist/index.css`.

**ThemeProvider**: Wraps components to provide theme context (light/dark modes). Check `ThemeProvider.tsx` for usage.

### Demo App (`app/`)

**Purpose**: Showcases all library components and serves as development playground. Each demo demonstrates a component's API and usage patterns.

**Local Linking**: Uses `install-local` npm package to link the local `ui/` package. This is transparent to development—editing `ui/src/` instantly reflects in the app.

**⚠️ Critical Import Rule**: Always import from `flowcloudai-ui` package, NOT from `../../ui/src`. This ensures Context providers (ThemeProvider, AlertProvider, ContextMenuProvider) and their corresponding hooks use the same instance. Importing from `../../ui/src` directly can cause context mismatches and runtime errors like "useTheme must be used within <ThemeProvider>". Examples:
- ✅ `import { useTheme, CheckButton } from 'flowcloudai-ui'`
- ❌ `import { useTheme, CheckButton } from '../../ui/src'`

### Key Dependencies

- **React 19** — Modern React with hooks
- **@dnd-kit/core** — Drag-and-drop for Tree and other components
- **Vite 8** — Fast dev server and build tool
- **tsup 8** — Zero-config library bundler (ESM + CJS)
- **TypeScript ~5.9** — Type safety across library and app

### Tauri Integration

The vite.config.ts includes Tauri-specific configuration:
- Detects `TAURI_ENV_PLATFORM` and sets appropriate build targets (Chrome 105 for Windows, Safari 13 for macOS/Linux)
- Handles HMR (Hot Module Replacement) over WebSocket when running in Tauri context
- Supports environment prefix for Tauri variables (`VITE_*` and `TAURI_ENV_*`)

This suggests the project may be packaged as a Tauri desktop app in production, though the web app works standalone.

## Component Library Tour

Components in `ui/src/components/`:

- **Button** — Basic button + CheckButton (toggle button)
- **Input** — Text input with theming
- **Slider** — Range slider
- **Select** — Dropdown select
- **Tree** — Hierarchical tree view with drag-and-drop (includes DeleteDialog, OrphanDialog helpers)
- **ListGroup** — Vertical list of items
- **Card** — Content container
- **Alert** — Alert notifications (context-based)
- **LazyLoad** — Lazy-loads content on scroll
- **Chat** — Chat interface
- **TabBar** — Tab navigation
- **SideBar** — Side navigation panel
- **RollingBox** — Animated box component
- **ContextMenu** — Context menu (right-click menu, context-based)

Each component should have:
1. A `.tsx` implementation file
2. An export in `ui/src/index.ts`
3. A demo in `app/src/demos/ComponentNameDemo.tsx`

## ESLint Configuration

Flat config in `eslint.config.js` covers:
- JavaScript best practices
- TypeScript type checking (recommended level)
- React hooks rules
- React Refresh plugin for Vite HMR

Run linter before committing code.

## Notes for Development

- **Monorepo management**: The `app/` uses a local npm link (via install-local) to depend on `ui/`. This is fully transparent—no manual linking steps needed after `npm run install:local`.
- **CSS distribution**: Styles are separate from component JS. Consumers must explicitly import the CSS file. This allows for CSS-in-JS alternatives or custom styling.
- **TypeScript strict mode**: Project uses TypeScript ~5.9 with strict settings. Type all component props and returns.
- **No build step for app in development**: Vite handles everything transparently.

## Git Notes

Current branch is `main`. Recent commits show component refactoring and demo restructuring activity.

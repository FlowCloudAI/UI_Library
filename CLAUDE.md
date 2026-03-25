# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a monorepo with two independent packages:
- **`ui/`** — `flowcloudai-ui` component library (published to npm, v0.1.0)
- **`app/`** — Playground/demo application that consumes the component library locally

The packages use separate `package.json` files (not npm workspaces). `app` depends on `ui` via a local symlink managed by the `install-local` tool.

## Commands

### UI Library (`ui/`)
```bash
cd ui

npm run build            # Build with tsup → dist/
                         # Produces: ESM, CJS, TypeScript declarations, CSS bundle
                         # Output: dist/index.js, dist/index.cjs, dist/index.d.ts, dist/index.css
```

To develop and test UI changes locally, edit components then run `npm run build` in `ui/`. Changes are immediately available to `app/`.

### App / Playground (`app/`)
```bash
cd app

npm run dev              # Start dev server on port 5173
                         # Loads components from ../ui/dist (must rebuild ui after changes)

npm run install:local    # Re-link the local ui package after cloning or major ui changes
                         # Runs: npm install && install-local --save ../ui
```

## Development Workflow

**When working on components in `ui/`:**
1. Edit component files in `ui/src/components/`
2. Run `npm run build` in `ui/` to rebuild the distribution
3. Changes are automatically available to `app/` (no restart needed due to Vite HMR)

**When starting fresh (after cloning or dependency changes):**
```bash
cd app
npm run install:local    # This sets up the symlink to ../ui
npm run dev              # Start the playground
```

## Architecture

### Package Relationship
`app` imports from `ui` using the symlinked `node_modules/flowcloudai-ui`, which points to `ui/dist/`. After editing `ui/` source files, rebuild with `npm run build` to apply changes in `app/`.

Examples:
```ts
import { Button, ThemeProvider } from 'flowcloudai-ui'
import 'flowcloudai-ui/style'
```

### UI Library Build (tsup)
`ui/` uses **tsup** (not Vite) to build TypeScript components. Configuration is in `ui/tsup.config.ts`:
- **Entry point:** `ui/src/index.ts`
- **Output formats:**
  - `dist/index.js` (ESM) — used by modern bundlers
  - `dist/index.cjs` (CommonJS) — for Node.js compatibility
  - `dist/index.d.ts` (TypeScript declarations)
  - `dist/index.css` (standalone CSS bundle)

**Important:** CSS is **not auto-injected** into bundles. Consumers must explicitly import:
```ts
import 'flowcloudai-ui/style'
```

### Component Structure
Each component lives in `ui/src/components/{ComponentName}/` with:
- `{ComponentName}.tsx` — component implementation
- `{ComponentName}.css` — scoped styles (can import from `../style/index.css` for design tokens)

All components must be re-exported from `ui/src/index.ts` to appear in the public API. Examples:
- `Button/Button.tsx` + `Button/Button.css`
- `Tree/Tree.tsx` + utilities like `flatToTree`
- `Bar/TabBar.tsx` + `Bar/SideBar.tsx`

To add a new component:
1. Create `ui/src/components/{ComponentName}/{ComponentName}.tsx`
2. Add CSS to `ui/src/components/{ComponentName}/{ComponentName}.css`
3. Export from `ui/src/index.ts`: `export * from "./components/{ComponentName}/{ComponentName}"`
4. Run `npm run build` in `ui/`

### Design System
**CSS Tokens:** Defined in `ui/src/style/index.css` using CSS custom properties with the `--fc-` prefix (FC Design System).

**Token categories:**
- Colors: 12 color families (each with multiple shades), accessible via `var(--fc-color-{family}-{shade})`
- Spacing: `--fc-space-*` (consistent margins/padding)
- Typography: `--fc-font-*`, `--fc-text-*`
- Radius: `--fc-radius-*` (border radius presets)
- Shadows: `--fc-shadow-*`

All components should use these tokens instead of hardcoded values.

### Theme System
**ThemeProvider** (`ui/src/ThemeProvider.tsx`) manages theme switching via React context:
- Supports: `"light"`, `"dark"`, `"system"` (follows OS preference)
- Sets `data-theme="light"|"dark"` attribute on `document.documentElement`
- Must wrap the entire app (see `app/src/main.tsx`)

**useTheme hook** returns `{ theme: Theme, setTheme: (theme: Theme) => void }` for components that need to detect or change the current theme.

### Context Providers
Two providers from `ui/src/index.ts`:

1. **ThemeProvider** — Wraps app for theme support
   ```tsx
   <ThemeProvider defaultTheme="system">
     {/* rest of app */}
   </ThemeProvider>
   ```

2. **AlertProvider** — Provides imperative alert/modal API
   ```tsx
   <AlertProvider>
     {/* rest of app */}
   </AlertProvider>
   ```

Both are used in `app/src/main.tsx`.

### Vite Configuration
Root `vite.config.ts` is shared by both packages:
- **React plugin:** `@vitejs/plugin-react` with Oxc transformation
- **Tauri support:** Detects `TAURI_ENV_*` environment variables and adjusts build targets:
  - Windows: `chrome105` (Chromium in Tauri)
  - macOS/Linux: `safari13` (WebKit in Tauri)
- **Minification:** Disabled when `TAURI_ENV_DEBUG` is set
- **Source maps:** Enabled when `TAURI_ENV_DEBUG` is set
- **Watch exclusion:** Ignores `**/src-tauri/**` to avoid rebuilds on Rust changes

Used by: `app/` (Vite dev server) and potentially for library demos.

### TypeScript Setup
**Project references** configured in root `tsconfig.json`:
- Root references both `ui/` and `app/` as sub-projects
- `ui/tsconfig.json`: Sets `emitDeclarationOnly: true` (tsup handles JS compilation)
- `app/tsconfig.json`: Standard React + Vite config

This allows both packages to type-check independently while sharing ESLint config and Vite config.

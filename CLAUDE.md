# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Development:** `pnpm dev` (runs Shopify app in dev mode)
- **Build:** `pnpm build` (uses Remix with Vite)
- **Lint:** `pnpm lint` (ESLint with Prettier)
- **Start:** `pnpm start` (serves the built application)
- **Test Extension:** `cd extensions/[extension-name] && npm run test` (uses Vitest)
- **Build Extension:** `cd extensions/[extension-name] && npm run build`
- **Preview Extension:** `cd extensions/[extension-name] && npm run preview`

## Style Guidelines

- **Formatting:** Use Prettier with ESLint integration
- **TypeScript:** Strict mode enabled, ES2022 target
- **Imports:** Use path alias `~/*` for app imports
- **Naming:** PascalCase for components, camelCase for functions/variables
- **File Naming:** kebab-case for files, `.server.js` suffix for server code
- **Test Files:** `.test.js` suffix, using Vitest with describe/it blocks
- **Error Handling:** Clear error codes, validation, descriptive messages
- **Components:** Follow Shopify Polaris patterns where applicable
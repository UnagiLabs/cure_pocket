# 共通指示 (Common Guidelines)

## Development Philosophy
- **Backward compatibility is not assumed unless explicitly requested**—remove unnecessary code to reduce technical debt; favor clean refactoring over preserving legacy interfaces.
- Always prioritize maintainability and code clarity over legacy support when no specific compatibility requirement is given.

## Project Structure Overview
- `contract/` holds the Sui Move package defined by `Move.toml`, with `sources/` for modules and `tests/` for Move unit suites.
- `frontend/` is the Next.js 16 App Router client; the entry point lives under `src/app` and global styling in `src/app/globals.css` with public assets in `frontend/public`.
- Keep docs (README, AGENTS) at the repo root so contributors can quickly orient themselves before touching either binary or web artifacts.

---

# コントラクト指示 (Contract Guidelines)

## Sui Move Package Structure
- Package code resides in `contract/sources/`; tests are in `contract/tests/`; build artifacts will be generated in `contract/build/`.
- Run `sui move build` and `sui move test --coverage` before PRs, and record new package IDs inside frontend configuration files and PR summaries.
- Keep struct and event schemas aligned between Move modules and frontend integration code.

## Build and Test Requirements
- **After editing any Move contract, always run `sui move build` locally and ensure there are no errors or warnings.** Do this continuously during development, not just before PRs.
- **Do not casually add `#[allow(lint(...))]` to suppress warnings.** First consider proper remedies (e.g., design adjustments, visibility/ownership fixes, removal of unused code). If suppression is truly necessary, minimize its scope and clearly document the rationale in code comments and in the PR description.

## Move 2024 Function Visibility Guidelines

**Principles:**
- Minimize public exposure: start with `public(package)`, use `public` only when needed outside package (Move 2024 deprecates `public(friend)`)
- `entry` functions are thin PTB entry points: handle argument validation, TxContext, events; delegate core logic to `public`/`public(package)` functions
- Prioritize testability and composability by minimizing side effects in core logic

**Visibility Rules:**

| Modifier | Callable From | PTB Access | Use Case | Constraints |
|----------|---------------|------------|----------|-------------|
| (default) | Same module only (private) | ❌ No | Internal helpers | Start here; expand visibility only when needed |
| `public` | Any module | ✅ Yes | Reusable logic, SDK/wallet/CLI endpoints | No return/argument restrictions; highly composable |
| `public(package)` | Same package modules only | ⚠️ No (combine with `entry` if needed) | Package-internal APIs | Restricts cross-package composition |
| `entry` (alone) | Not callable from other modules | ✅ Yes | Transaction entry only | Return types must have `drop` ability; object reuse restrictions in same PTB |

**`entry` Constraints:**
1. Return values must have `drop` ability
2. Cannot reuse objects passed to non-`entry` functions within same PTB
3. Functions returning references are not PTB-callable

## Module Architecture Rules

**File-based Function Placement:**
- **`accessor.move`**: All `public fun` and `entry fun` definitions must reside here. This serves as the single public API surface.
- **Other module files**: May only contain private functions (`fun`) or package-internal functions (`public(package) fun`).
- **`admin.move`**: All `public fun` that require `admin_cap` parameter must be defined here, separate from regular public functions.

**Rationale:**
- Centralizes public API in `accessor.move` for clear external interface
- Isolates admin operations in `admin.move` for security and auditability
- Keeps implementation details private or package-scoped in other modules

## Contract Testing
- Sui CLI tests live in `contract/tests/` and run via `sui move test --path contract`; keep each test file focused on one capability (e.g., mint lifecycle).
- From the repo root, `sui move build` and `sui move test` (run inside `contract/`) compile the package and execute the Move test suites defined under `contract/tests/`.

---

# フロントエンド指示 (Frontend Guidelines)

## Next.js Structure
- `frontend/` is the Next.js 16 App Router client
- Entry point lives under `frontend/src/app`
- Global styling in `frontend/src/app/globals.css`
- Public assets in `frontend/public`

## Build, Test, and Development Commands
- **Package manager: Always use `bun` for all package management operations** (the project ships a `bun.lock`).
- `bun install` inside `frontend/` to populate `node_modules`
- `bun run dev` (from `frontend/`) starts Next.js locally on `localhost:3000`
- `bun run build` and `bun run start` build and serve the production bundle
- `bun run lint` / `bun run format` run Biome for static analysis and formatting in the frontend codebase
- **After editing any frontend code, always run `bun check` locally and ensure there are no errors or warnings.** Do this continuously during development, not just before PRs.

## Coding Style & Naming Conventions
- Frontend TypeScript follows Next.js defaults: 2-space indentation, `camelCase` identifiers, React components capitalized, hooks prefixed with `use`.
- Manage spacing and file layout with Biome (`npm run format`/`npm run lint`); commit only after the formatter exits clean to avoid style drift.
- Frontend relies on Biome checks for correctness; add fixture folders under `src/` before writing heavier integration tests.

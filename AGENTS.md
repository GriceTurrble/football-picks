<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` - verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Basic rules

- This project uses `pnpm`, not `npm`, as a package manager and runner.
- The project runs in Node 26+: use `import`, not `require()`.
- This is a side project, never going to "production". We don't need to check a production build when developing.
- When linting, invoke `just lint`, which is part of my "common" Justfile recipes.
  - If this fails due to a missing recipe, it may be because `common.just` is missing.
  - If `common.just` is missing, run `just sync-commons` first to download it, then re-run the original command.

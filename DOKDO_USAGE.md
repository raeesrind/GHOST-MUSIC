# Dokdo — Replaced

**Dokdo** (`dokdo`) has been **removed** and replaced with a zero-dependency secure developer console in `index.js`.

## What replaced it

A custom `?eval`/`?jsk` command system built directly into `index.js` (lines 92-124):

- **Prefix**: `?`
- **Commands**: `?eval <code>`, `?jsk <code>`, `?ping`
- **Owner-only**: gated by `client.owners.includes(message.author.id)`
- **Eval engine**: `eval()` wrapped in an async IIFE for `async/await` support
- **Output**: inspected with `util.inspect` (depth 2), truncated at 1900 chars, sent in a ` ```js ` codeblock
- **Error handling**: full stack traces returned in the same codeblock format
- **Context available** in eval: `client`, `message`, `guild`, `channel`, `user`, `args` (all in closure scope)

## Changes made

| File | Change |
|------|--------|
| `index.js:65` | Removed `const Dokdo = require("dokdo")` |
| `index.js:89-93` | Removed `new Dokdo.Client(...)` instantiation |
| `index.js:101-103` | Replaced `client.Jsk.run(message)` with new handler |
| `package.json` | Can remove `"dokdo": "latest"` dependency |

## Resolution of peer dep conflict

Since Dokdo is gone, the `undici@^7.8.0` peer dependency conflict with `kazagumo-spotify` (`undici@^6`) is no longer an issue. Remove `dokdo` from `package.json` and run `npm install` to clean it up.

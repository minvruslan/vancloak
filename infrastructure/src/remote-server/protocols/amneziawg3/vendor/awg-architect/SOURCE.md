# awg-architect (vendored)

AmneziaWG obfuscation parameter generator, taken from Any Tech ARCHITECT.

- Upstream: https://github.com/Vadim-Khristenko/Any-Tech-ARCHITECT
- Commit: `ac95275a25f25ef6bbf73eb3ab0299911a47208b` (2026-08-24)
- Licence: MIT, see `LICENSE`

## What is here

The transitive closure of `src/engines/awg/generator/index.ts` — 31 files, no runtime
dependencies beyond `globalThis.crypto`. The entry point is `genCfg(GeneratorInput): AWGConfig`.

Two changes were applied to the upstream sources, both mechanical:

- `@/…` alias imports rewritten to relative paths;
- `// @ts-nocheck` prepended to every file, because this repository compiles with
  `noUncheckedIndexedAccess` and upstream does not. The sources are clean under upstream's
  own strictness — `tsconfig.json` in this directory checks them that way.

Types still cross the boundary: `@ts-nocheck` suppresses errors inside a file, not the types
it exports, so a wrong argument to `genCfg` is still a compile error for us.

## Checking it

```
npx tsc -p infrastructure/src/remote-server/protocols/amneziawg3/vendor/awg-architect/tsconfig.json
```

The directory is excluded from ESLint (`eslint.config.mjs`) and Prettier (`.prettierignore`):
repository naming and comment rules do not apply to upstream code.

## Updating

Re-take the closure from a newer upstream commit, re-apply the two mechanical changes, update
the commit hash above, and run the check. Our own code only ever reaches the generator through
`generateEndpointObfuscation` and `generateClientObfuscation`, so nothing outside this
directory should need edits.

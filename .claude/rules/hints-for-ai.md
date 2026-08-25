# Hints for AI (monorepo-wide)

## Package manager: pnpm, not npm

This repo is a **pnpm workspace monorepo** — always use `pnpm`, never `npm` or `yarn`.

- Root scripts orchestrate packages via `pnpm --filter @vancloak/<pkg>` (see root `package.json`).
- Run a package script: `pnpm --filter @vancloak/backend <script>` or `cd backend && pnpm <script>`.
- Install: `pnpm install`. Add a dep: `pnpm --filter @vancloak/<pkg> add <dep>`.
- Lockfile is `pnpm-lock.yaml`; workspace layout in `pnpm-workspace.yaml`. There is no `package-lock.json`.

## Backend tests

- Test file layout: root `describe` = protocol-independent flow; `describe("amneziawg2")` = tests coupled to the protocol implementation (to be mirrored per protocol); `describe("technical")` = states unreachable with honest data, via query-layer mocks. No other `describe` sections. Section order is fixed: all root-level tests first, then the nested sections at the bottom of the file, with `describe("technical")` always last.
- One scenario → one test: identical arrange + act means ONE test asserting every consequence; the condition lives in the test name ("... when the node-side delete fails"). Separate tests are justified only by different arranges or triggers, never by different assertions on the same act.
- Every rejection path asserts the absence of side effects: no rows written or changed, no node calls (`not.toHaveBeenCalled()`). Every retry/cleanup path asserts the node call actually happened.
- Protocol identifiers only via `ProtocolCodeSchema.enum.*` / `ProtocolRegistry.*` — never string literals. Time offsets derive from the implementation constant (`CONSTANT + 1` minute), never magic numbers.
- Concurrency tests synchronize with deferred promises + `waitForDatabaseLockWaiter` — never `setTimeout`.
- HTTP-status tests exist only for statuses declared in the contract `.errors()`. Trivial oRPC codes are never tested per route: BAD_REQUEST from input-schema validation (non-uuid, missing/empty/too-long fields) and UNAUTHORIZED from the auth middleware are framework behavior, not module logic — auth is covered once in `backend/tests/src/api/orpc/authorized.test.ts`, and schema wiring is proven by any case that distinguishes a valid input (e.g. unknown-id NOT_FOUND).
- FORBIDDEN on an admin route IS tested per route, with exactly one ordinary-user test ("rejects an ordinary user with FORBIDDEN"): the access level is per-route contract configuration (`adminAccess` vs `userAccess`), so only a per-route test catches an accidental downgrade in the contract. No "own record"/"other record" variants — the middleware never looks at the input. The middleware internals stay covered centrally in `authorized.test.ts`.
- An HTTP success test exists only when the contract declares a custom `successStatus` (e.g. 201), and it asserts the status code alone — no schema parse, no field checks. Routes answering the default 200 get no HTTP success test at all. Response bodies are proven by `call()`-based tests, which run the same contract output validation.
- Response shapes are parsed with entity schemas imported from `@vancloak/api-contract` — never redeclared locally in a test file. Route outputs the contract declares inline (e.g. `z.array(ConfigSchema)`, `z.object({ id: z.uuid() })`) are mirrored inline in the test; single-use output wrappers do not get named schemas in the contract.

## Backend database queries

- A query that returns a domain entity must use the shared selection from `backend/src/core/database/selections` and the module's `createXFromDatabaseData` util — never assemble an entity with an ad-hoc projection.
- A narrow technical lookup (count, single field, node access data) defines its minimal projection locally in the query file and does not go into `selections`.

## Code conventions

- No explanatory comments in code. A comment may only state a constraint the code cannot express; the sole tolerated markers are the frontend desktop/mobile section markers.
- Spell identifiers out, no abbreviations: `stateDirectory` not `stateDir`, `PRESHARED_KEY` not `PSK`. Acronyms inside identifiers are camelCase (`sshPort`, `clientIp`) — enforced by `vancloakNaming/camel-case-acronyms`.
- Config/settings objects and any constant exported from its own file are PascalCase, the file named after the export (`TunnelMtu.ts`, `CommandRunnerMode.ts`) — never SCREAMING file names. SCREAMING_SNAKE only for file-local constants (`SSH_PRIVATE_KEY_MOUNT_PATH`).
- Name by role, never by current value: `service_username`, not `vancloak_username`.
- Use the library's documented identifier names (oRPC: `os`, `authMiddleware`, `authorized`) — never invent replacements.
- No premature abstractions: no base classes, interfaces or generics for a single implementation; extract when the second consumer lands.
- Map domain enums via an exhaustive `Record` keyed on the union type — adding a value must fail compilation until every map declares it.
- Terminology: the user-facing part is "user", never "portal"; say "main node" and "app DB", never "control-plane".

## Backend module patterns

- Services return the `ServiceResult` envelope: `{ ok: true, data: { named } } | { ok: false, errorCode, error? }`. Routes unwrap it, map `errorCode`s to HTTP errors, and log every failure — warn for 4xx, error for 5xx.
- Module file placement: `queries/` = executor functions, `queries/conditions/` = shared SQL fragments, `utils/` = row→entity mappers (`createXFromDatabaseData`).
- Executor signatures: executor as the first required parameter = tx/lock-bound building block; executor as the last optional parameter (`= db`) = standalone service entry. The split is intentional, not an inconsistency.
- Verbs: `create*` = pure construction, `insert*`/`signIn*` = database writes — test helpers included.
- Result variables are named after the call: `const deleteUserConfigsResult = await deleteUserConfigsService(...)` — no invented role names.

## Data boundaries

- `encryptedJsonb`/`encryptedText` columns are the only encryption boundary. `client_identifier` is plaintext by design (SQL allocation and uniqueness only) and must never hold a secret.
- `data` jsonb columns are parsed with zod in the query files; `unknown` never leaves the query layer. The contract keeps `unknown`/looseObject on purpose.

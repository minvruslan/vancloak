# Deferred work

Deliberately deferred items. Each entry names the trigger that turns it into required scope.

## Server ip is not unique

Nothing stops two `server` rows from holding the same `ip` — no unique index and no check in `createServerService`. Two rows on one ip mean one physical machine registered twice: `endpoint_server_port_uq` is scoped to `serverId`, so both rows can claim the same port, and the second provision job overwrites the first one's node config.

Fixing it is now a plain unique index on `ip`, which became possible once the column stopped being encrypted. Deferred because server creation is admin-only, so this guards against an admin typo, not hostile input.

## No compatibility check for stored `data` against a changed contract

Nothing verifies that rows written under an older `data` shape survive a contract change. The read boundary is uneven: `ServerData`/`EndpointData` go through `safeParse` with `looseObject` schemas in query files (failure degrades to `null`), but `ConfigData` flows from the row into the route response with no read-side parse (`configSelection` → `createConfigFromDatabaseData`), where the strict `Amneziawg3ConfigDataSchema` in the contract validates it as oRPC output. A rename or a new required field in the contract makes every pre-change config row fail output validation at runtime — nothing in CI turns red before deploy. Existing `unknownField` tests cover request input only; test helpers always write the current shape, so fixtures silently track the schema and hide the breakage.

Options: golden fixtures — frozen raw `data` payloads for each shape that ever shipped, inserted into the database as-is and read back through routes (the direct answer); a schema snapshot test (`z.toJSONSchema`) enforcing additive-optional-only changes (the cheap guard); or a migration rule — any breaking shape change must ship with a data migration, shrinking the fixture set to current plus previous. Becomes required scope on the first non-additive change to any `data` schema.

## Update is allowed for pending configs

`updateUserConfig` uses the same visibility condition as reads (active OR pending younger than the reservation window), so a config that is still being created can be renamed mid-flight. A pending config is a reservation, not an editable entity — the only sensible action on it is cancellation (delete). Decision: restrict update to `status = 'active'` only. The change is the condition in the `updateUserConfig` query; in tests, "updates a pending config younger than the reservation window" is removed and "rejects a pending config older than the reservation window with NOT_FOUND" becomes "rejects a pending config with NOT_FOUND" (any pending, no window arithmetic). Consequence to accept: a pending config is visible in the config list, so renaming it during the ~6-minute window returns "not found". Becomes required scope on the next change to the config module.

## Required `deviceTypeId` breaks rename when the device type is disabled

`UpdateConfigSchema` requires `deviceTypeId` in every update, and the service rejects disabled device types with `DEVICE_TYPE_INVALID`. A user whose device type got disabled after config creation cannot even rename the config — resending their current `deviceTypeId` fails validation. Options: (a) validate `isEnabled` only when the type actually changes — a resent current `deviceTypeId` skips the check (no contract change, recommended); (b) make `deviceTypeId` optional in the update contract; (c) keep as is. Becomes required scope the first time a device type is disabled in production.

## Function declaration style is not uniform in src

`src` mixes function declarations with arrow-assigned consts. Exported functions are declarations everywhere, but a handful of internal ones are arrows, so neither style is the rule.

`func-style: ["error", "declaration", { allowArrowFunctions: false }]` is enabled for `tests/**/*.ts` only (2026-08-04, together with the test-helper refactor). Pick one style for `src` — declarations or arrows — convert the outliers, and widen the rule to cover `src/**/*.ts` so it cannot drift again. Deferred because it touches worker step files unrelated to the test refactor that raised it.

## Admin and user config list stacks are parallel, not shared

Configs are rendered by two structurally mirrored but visually different component stacks. Admin: feature `config-list` → entity `ConfigListSelf` → entity `ConfigList` → entity `ConfigCard`/`ConfigCardSkeleton` (one-line pseudo-table row, protocol badge, Open button, common `ListEmptyState`). User: feature `user/home` `ConfigListCard` → `ConfigList` → `ConfigCard`/`ConfigCardSkeleton` (two-line row with obfuscation pill, own `ConfigListEmptyState` with a create CTA), all feature-local; there is no `Self` counterpart — `UserHome` is the single data owner (`useConfigs` + `useConfigLimits`) and passes props down, because a second same-key `useAsyncData` subscriber refetches on client navigation (duplicate GET requests). Known divergences beyond visuals: names collide across the folders (two `ConfigList`s, two `ConfigCard`s, two skeletons); the user empty state replaces the whole section including its header, so the empty decision lives in `ConfigListCard`; the user scroll container compensates the section padding with negative margins, coupling the dumb `ConfigList` to the section shell. Trigger: when the admin list adopts the user card visuals, converge on one entity-owned stack (single card + skeleton + list + self), delete the admin pair, and resolve the name collisions.

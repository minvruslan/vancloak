# Endpoints, copies and personal domains

What we build in this iteration, and why. Supersedes `endpoint-placement-plan.md`, which
described the same direction before the DNS naming model was decided.

## Goals

- **A machine can be replaced without reissuing anything.** Today the address a client dials is
  the machine (`server.domain_name ?? server.ip`), baked into the endpoint's node state at
  provisioning. Losing a machine, changing a hoster or catching an IP block therefore means
  touching every user. The address moves onto the thing that survives the machine.
- **The database can describe one endpoint on several machines.** Not to run two copies today,
  but so that adding them later is a feature, not a migration.
- **A person can be moved between copies without touching their file.** What is printed in a
  config cannot be changed afterwards, so the addressing decision has to be made now, at issue
  time — everything else can be added later.
- **Existing configs keep working, untouched.** They carry the address they were issued with and
  stay on it; people move to personal names naturally, as they issue new configs.

Explicitly not a goal now: creating a second copy, converging copies, moving people. Those are
internal mechanics and can arrive at any time.

## The model

- **Endpoint** is the identity: server keys, port, obfuscation, subnet. It lives in the database
  and can be installed on any machine.
- **Server** is the machine: `ip` and `domain_name` are how _we_ reach it (SSH, the target of a
  DNS record). Neither goes into a client file any more.
- **`endpoint_placement`** is one row per "this endpoint runs here". Several rows mean several
  identical copies. Zero rows is a valid state: keys outlive machines.
- **`endpoint.host`** is the endpoint's domain — the name under which people reach it.
- **`endpoint_placement.host`** is one copy's own name, the address of a single machine among those
  running the same endpoint. Empty until copies exist. It never appears in an ordinary file, only in
  one issued deliberately on a chosen copy.
- **`config.host`** is what is printed in one person's file. Written once at issue, never edited.
- **`config.placement_id`** is the copy currently serving that config. `null` means no copy does.
  It must agree with where that config's name actually resolves: the peer has to sit on the machine
  the client dials. Since a person has one name per endpoint, all of their configs there share one
  copy.
- **Every `host` column is plaintext.** These are allocation columns, not secrets: issuing checks a
  computed label against the addresses already in use on the endpoint, which has to be one SQL query
  over `config.host`, exactly as `client_identifier` is one query over the client IPs. Encryption
  stays where it belongs — inside the `data` blobs nobody queries into.

Four names, and all of them only where the endpoint has a domain:

```
server.domain_name           how we reach the machine — SSH, the target of a record. Never printed.
endpoint.host                the endpoint's own name; a personal name is composed from it.
endpoint_placement.host      one copy's own name, for placing a person on a chosen machine.
<label>.<endpoint.host>      a person's name — what is written into config.host.
```

Without a domain none of this applies: the file carries the copy's IP and the endpoint stays on one
machine forever.

### Two modes

`endpoint.host` empty — files carry the copy's IP, and the endpoint may only ever have one copy,
because two copies would print two different addresses. This is today's behaviour and it stays
supported. Going from this mode to a domain is not possible: the IP is already printed in files,
so those people stay pinned to that machine forever.

`endpoint.host` set — files carry a name of the person, not of the machine:

```
vvv.com                              the zone, separate from the application's domain
7c1f4a9b2e60.vvv.com                 the endpoint's address — an A record pointing at the machine
9f2c41ab77de.7c1f4a9b2e60.vvv.com    a person's address, resolved through the wildcard
```

Every label is twelve lowercase hex characters and all three levels look alike on purpose. A name
tells an outsider nothing: not how many endpoints exist, not which one this is, not who a person is.
A label made of digits only is regenerated — legal in DNS, but some client parsers read it as
something else.

The operator chooses the zone and nothing more. The endpoint's key is six random bytes, generated
when the endpoint is created, stored whole in `endpoint.host` and checked against the names already
used in that zone. It is deliberately not derived from anything: a burned name can then be reissued
without a version counter inside a secret that may never be rotated.

The person's label is the one thing that is computed, because it has to exist before that person
owns a single config — that is what lets a record be created in advance to point them at a chosen
copy:

```
label = hmac(APP_LABEL_SECRET, user_id + ":" + endpoint_id) → first 12 hex characters
```

Those two inputs and no others. The copy is not among them, or moving a person between copies would
change their name; neither is the zone, so a person keeps their label when the endpoint's domain
changes.

Nothing about labels is stored. An address is reused verbatim from a person's existing config on
that endpoint **only when it is already a personal name under the endpoint's current domain** —
when it ends in `.<endpoint.host>`. Everything else (an address from an older domain, a copy's own
name, a machine IP) is not reused, so issuing always converges back to the personal name and a
config pinned to one machine never makes the next ones sticky. Otherwise the label is computed and
checked against the addresses already printed on that endpoint — one query over `config.host`,
alongside the one that finds a free client IP — falling through to the next hmac iteration in the
one-in-a-million case that it is taken. `APP_LABEL_SECRET` must never be rotated: labels are
printed in files.

There is no third mode. A domain without personal labels buys nothing a wildcard does not, and
mixing the two inside one endpoint produces people who cannot be moved individually.

### Records the operator keeps

Two records per endpoint, created once when the server is added:

```
7c1f4a9b2e60.vvv.com      A      201.12.12.12
*.7c1f4a9b2e60.vvv.com    CNAME  7c1f4a9b2e60.vvv.com    TTL 60
```

That is the whole DNS work. Issuing a config creates nothing: a personal name already resolves
through the wildcard. Moving everyone to another machine is one edit of the endpoint's A record;
moving one person is one explicit record for their name, which beats the wildcard.

A second endpoint lives in the same zone under its own key, with its own wildcard — the wildcards do
not collide because each belongs to one endpoint.

The zone for endpoints is registered separately from the application's domain: different
registrar, different DNS account, a name that does not resemble the panel's. The reason is blast
radius — one abuse complaint, one suspended account or one blocked zone must not take both down.
What actually links two zones from outside is a similar name, shared machine IPs, a shared
registrar login and payment method, and certificate transparency logs for anything with a
certificate; Cloudflare's assigned nameserver pair is not such a link, since the pool is shared
across accounts and one account can be given different pairs.

### Changing an endpoint's domain

Allowed. What is printed in a file is a name, and a name can be repointed — only a printed IP pins
a person to hardware. The price is bookkeeping: the old zone has to keep resolving while any live
config still names it, and a machine migration then means editing the endpoint's record in every
zone that still has people in it. The interface says exactly that before saving, and verifies the
new domain the same way creation does.

## Before the first release

For every endpoint that already has a domain, create the wildcard **before** upgrading. The
migration fills `endpoint.host` with the domain the endpoint currently answers on — a name that was
chosen by hand, not a generated key, and it stays that way; keys are generated only for endpoints
created after this work lands. From that moment new configs print `<label>.<domain>`; without the
wildcard those files do not resolve. Already issued files are unaffected — they carry the old
address and keep working.

Servers with no domain keep `endpoint.host` empty and stay on IP forever. Personal labels there
require a new endpoint.

## Three blocks

The seven steps fall into three groups, and the first one changes nothing anybody can see.

**A — the move (steps 1-3).** The schema learns to describe one endpoint on several machines, every
reader and writer goes through a copy, and the old link is dropped. Behaviour stays exactly as it is
today. This block can be finished and left alone: nothing breaks and nothing changes.

**B — the point of the work (steps 4-5).** The address stops being a property of the machine and
becomes a parameter of issuing, and configs start carrying a personal name instead of the machine's
address. This is the only part users notice, and only on newly issued configs.

**C — the tails (steps 6-7).** Deletion paths that the move itself opens up, and the form and cards
for the domain. Required once block A is out, because that is what makes "an endpoint with no
machine" reachable.

## Steps

One PR per step, each ending in a state that is verified by hand. One PR is not one release: the
whole iteration ships as a single tag and updates production once.

That works because the one-shot `migrate` container runs to completion before `api` and `worker`
start, and drizzle applies every pending migration inside one transaction. Each migration file
carries its own data statements after its DDL, so the additive schema, the rows that fill it and the
tightening that follows all land in order inside that single run. No application code takes part:
since the database stopped encrypting columns, every value this migration needs is readable from
SQL. Nothing is served from half-filled data, and a failure anywhere leaves the previous containers
running.

Verification therefore happens before the release, on a restored copy of the production database,
not between deployments. The one irreversible moment is step 3: until it is applied the whole
release rolls back by switching the tag, and after it `server_id` is gone for good.

### 1. Additive migration and backfill

- `endpoint_placement` (`endpoint_id` cascade, `server_id` cascade, `host`, `data`, timestamps,
  `unique(endpoint_id, server_id)`), `endpoint.host`, `config.host`, `config.placement_id`
  (`set null`). Nothing is dropped: `endpoint.server_id` stays and all existing code keeps working.
  `endpoint_placement.host` is the copy's own name and stays empty until copies exist; it is added
  now so that the table is not touched again when they do.
- The rows are filled by plain SQL appended to the generated migration file, in this order: one
  placement per endpoint from its current `server_id`, `endpoint_placement.data`,
  `config.placement_id` from that placement, `config.host`, and `endpoint.host` from
  `server.domain_name`. Written once, recorded in drizzle's journal, never run again — which is why
  none of it has to be idempotent.
- `endpoint_placement.data` takes over the endpoint's `actualState`, with the `host` key stripped:
  the applied state describes one machine, so it belongs to the copy. `endpoint.data` is left with
  `desiredState` alone — the identity, which any machine can run. A placement of an endpoint that
  was never provisioned stays empty.
- `config.host` is what is actually printed in the file — `config.data->>'host'` — falling back to
  the applied state, the server domain and the server IP for configs that never reached activation.

**Verify:** on a copy of the production database every endpoint has exactly one placement holding
the applied state without a `host` key, and `endpoint.data` carries `desiredState` alone; every
config has a `host` matching the address inside its own `data`, and a `placement_id`; an endpoint
whose server has a domain has that domain in `host`, and one without has none. The application
behaves as before.

### 2. The placement becomes the source: queries, writers, contract, frontend

- Config queries reach the server through `config.placement_id` (`leftJoin` — there may be no
  copy); endpoint queries through one placement per endpoint, picked deterministically, so two
  copies never double a list. `findServers`, `findServerById` and the worker's `findActiveEndpoints`
  go through the placement too.
- `provisionServerJob` writes the desired state to the endpoint and `actualState` to the placement
  of the machine it provisions. Readers of the applied state go to the placement.
- `insertEndpoints` creates the endpoint and its placement in one operation — otherwise a new server
  would get an endpoint nobody serves.
- Endpoint recommendation counts load per endpoint, not per server.
- `findReservedClientIdentifiers` takes an endpoint: two copies must not hand out the same client IP.
- Contract: the server block of an endpoint becomes nullable. This is forced by the `leftJoin`, not
  a design choice — a config without a copy must still be listed and deletable.
- Contract: an endpoint exposes its `host`. Nothing else is needed to tell configs apart — an
  address that parses as an IP is a machine address, one ending in `.<endpoint.host>` is a personal
  name, anything else is neither. No stored or derived field for this.
- Frontend reads `endpoint.server` in seven places, including the downloaded file name and the demo
  mode; all of them need the empty state.
- Test helpers: `insertTestEndpoint` loses `serverId`, `insertTestEndpointPlacement` appears,
  `insertTestConfig` gains `host` and `placementId`.

**Verify:** behaviour unchanged; a second placement created by a test helper does not double the
endpoint or config lists; provisioning wrote the applied state into the placement; a config whose
server is gone is still shown and can be deleted.

### 3. Tightening migration and the checks that moved into services

- `config.host` becomes NOT NULL; `endpoint.server_id` and the indexes depending on it are dropped.
  An ordinary migration file: it is applied after step 1's, in the same batch and the same
  transaction, so the rows it tightens are already filled.
- Port uniqueness per machine and "one endpoint per protocol per machine" move into
  `createServerService` **in this step** — otherwise there is a window with no protection. The
  constraint stays because the protocol client hardcodes container, directory and subnet names: a
  second endpoint of the same protocol would install over the first.
- Nothing has to be deleted afterwards: the data statements live inside step 1's migration file,
  which is history the moment it is applied.

**Verify:** the schema has no `server_id` and the application works; creating an endpoint on a
taken port, or a second endpoint of the same protocol on one machine, is refused by the service.

### 4. The address stops being a property of the node

- `host` is removed from the endpoint's desired and actual state.
- `createAccess` takes the host as a parameter, and so does the `ProtocolClient` interface;
  `createEndpointDesiredState` loses its `host` argument.
- Provisioning no longer computes `server.domainName ?? server.ip`. The machine stops knowing which
  name clients use to reach it.
- `config.data.host` is filled from the same value as `config.host`: one truth, not two. Issuing
  takes that value from `endpoint.host`, falling back to the copy's server IP — the step 5 formula
  without the label, so that editing a server's domain no longer changes what a new config prints.
  `insertEndpoints` fills `endpoint.host` from the server's domain until step 7 generates a key.

**Verify:** a config issued on an existing server prints exactly `config.host` and connects.

### 5. Issuing: copy, label, address

- A peer sits on the machine its own address resolves to — that is the whole rule, and the address
  kind decides. The target copy is therefore the one serving that person's existing config **on
  their personal name**: that name resolves to exactly one machine. A config issued on a copy's own
  name names its copy directly and takes no part in this choice, so a manual config on one copy
  never drags the person's ordinary configs onto it. Only a first config picks an active copy. No
  active copy means a declared error, not a 500 (`ENDPOINT_UNAVAILABLE`, 503).
- The advisory lock and the client-address search key on `endpoint.id`.
- Address: `<label>.<endpoint.host>` when the endpoint has a domain, the copy's server IP otherwise.
- An existing address of that person on that endpoint is reused only if it is already a personal
  name under the current domain; otherwise a label is computed, checked against the addresses
  already in use on the endpoint and moved to the next hmac iteration if taken. So a person on the
  old shared address, on a copy's own name or on a machine IP gets a personal name with their next
  config, and their earlier files are left alone.
- `APP_LABEL_SECRET` joins `EnvSchema`, `deploy/.env.example` and the password-manager list in
  `main-node.md`, marked as never rotated.

**Verify:** two devices of one person on one endpoint carry one label; an endpoint without a domain
prints an IP; the file connects through the wildcard record.

### 6. Deletion without dead ends

Reachable as soon as `endpoint.server_id` is gone — through the create-server rollback, if nothing
else.

- Config: the peer is removed on the copy it was created on, so configs are grouped by copy rather
  than by endpoint. A config with no copy recorded is its own group — the peer could be anywhere, so
  it is removed from every active copy. With no active copies at all the removal is a no-op and the
  row is deleted anyway; otherwise a config sticks in `deleting` forever while `restrict` keeps the
  endpoint alive.
- Server: its copy goes with it. Configs served by that copy move to another active copy of the
  same endpoint if there is one — which is what the operator does in DNS anyway — and only get
  `placement_id = null` when none is left.
- The create-server rollback deletes the endpoints as well — the cascade through `server_id` no
  longer carries them.
- Deleting an endpoint becomes its own service: delete its configs, notify the people, then delete
  the endpoint. Under a block this is the normal path, not an emergency one.

**Verify:** deleting a server with a second copy left moves its configs there; deleting the last one
leaves the endpoint alive and its configs visible with an empty server block; a config on a powered-off machine can be deleted; deleting an endpoint leaves no rows in
`deleting` and no endpoints without copies.

### 7. Creation form and cards

- The endpoint block gains a domain field, prefilled from the server domain. Empty means "one copy
  forever, IP in files", and the form says so.
- Before saving, a random label under that domain must resolve to the machine IP — that is what
  proves the wildcard exists. A couple of retries, because a fresh record can still sit in the
  resolver's negative cache.
- The domain can be changed later, with a warning that the old zone must keep resolving while
  configs still name it. What cannot change is the mode: an endpoint that prints IPs never gains a
  domain. The server domain stays an ordinary editable field.
- Configs are marked by comparing their address with the endpoint's: a personal name shows plainly,
  a machine address gets a quiet "machine address" badge, anything else "works as issued". Nothing
  here is an error state.
- Endpoint card: people, their labels, config counts. User card: their label per endpoint and the
  printed address of each config — for old configs it differs, and that is visible.

**Verify:** a server can be created with and without a domain; the form refuses a domain with no
wildcard and explains what was not found.

## Deferred

Everything here lands on the tables above without changing them.

- Creating a second copy from the interface: "server as a copy of an endpoint", the port check under
  a per-machine lock, installing the identity onto the second machine with its peers. A protocol
  whose identity cannot be duplicated gets a registry flag and this service refuses a second copy.
- The convergence worker: list peers on the node, compare with the database, add what is missing and
  remove what is extra. Needed only once there is more than one copy.
- Copy names in `endpoint_placement.host` — a key like an endpoint's, random and stored, with the
  endpoint's own record pointing at the current copy, so that moving everyone stays one edit. Two
  separate levers then exist: repointing a copy's record moves everybody on it, repointing the
  endpoint's moves only those on personal names. A copy name is also an address a config can be
  issued on, which is how a person is given a config on a chosen copy without waiting for the
  routing work below — the price is that such a config is pinned to its copy for life, since only
  the copy's whole record can be repointed, never that one person. Undecided: whether a copy is a
  sibling of the endpoint in the zone or sits under it. A sibling fails loudly when its record is
  wrong (NXDOMAIN); under the endpoint the wildcard swallows the mistake and answers with the
  current copy instead.
- Moving a person: an explicit record for their name, plus `placement_id` and the peer on the new
  copy. Their label is computable before they own a single config, so a person can be directed in
  advance by creating the record; issuing can then resolve their name and place the peer where it
  actually points.
- Routing chosen by the system instead of the user: the wizard asks for a protocol only,
  `endpointId` leaves the user request, and an endpoint and a copy are picked by policy — least
  loaded among those accepting new configs. A `user_routing` row (a preferred endpoint or a
  preferred copy, both `set null`) overrides it per person, and a flag reopens the detailed choice
  for advanced users. A person who already has configs on an endpoint keeps their copy, because
  their name resolves to exactly one.
- A diagnostic that resolves `config.host` and compares it with the IP of the copy in
  `placement_id`: the two truths can only drift if a record is edited outside the system.
- DNS management from the panel: zones, records, a Cloudflare driver (`PATCH /zones/{id}/dns_records/{id}`,
  DNS-only records, TTL 60). The button that moves everyone must also stop the container on the old
  copy — clients re-resolve only when the tunnel comes up.
- Label rotation (a version inside the hmac) and lookup by label (a plaintext column), if either
  turns out to be needed.
- Country: with copies in different countries, the country a person gets is the copy their name
  currently resolves to. Moving everyone across a border is a deliberate operation, never a
  side effect of balancing, and people are told.

## Not doing

- **`draining`** on a placement.
- **A "personal names on/off" flag.** A domain means labels and a wildcard; a domain without labels
  is not a mode.
- **A table of labels.** The label is a function of the pair; what was printed lives in `config.host`.
- **Going from IP to a domain.** An endpoint that prints machine IPs never gains a domain: those
  files pin their people to that machine, and the machine could then never be retired. Changing one
  domain for another is allowed — see above.
- **A stored or derived marker of how an address was formed.** An address that parses as an IP is a
  machine address, one ending in `.<endpoint.host>` is a personal name, anything else is neither.
  The frontend compares strings; nothing is stored and no field is computed for it.
- **Labels for old configs.** Their files carry a different address, so the record would be dead.
  A person gets a label with their first new config.
- **A `needs_reissue` status.** Delete, notify, let the person issue a new config: the expensive part
  — touching the person — is identical either way.

# Notification services for in-app feeds, and what realtime costs

Research for [#3](https://github.com/erikdrouhard/cohort-005-project-erik/issues/3) (map: [#1](https://github.com/erikdrouhard/cohort-005-project-erik/issues/1)). Gathered 2026-11-17. Prices change, so re-check the linked pages before deciding.

The question: for in-app Notification feeds in Cadence (React Router 8, one server, SQLite via Drizzle), what do Knock, Novu (cloud and self-hosted), MagicBell, Courier, and a home-built option offer? The comparison covers free tier, realtime, React feed components, identity, room for email later, and local dev.

## Summary table

| | Free tier (per month) | Realtime | React feed UI | Identity | Email later | Local dev without credentials |
|---|---|---|---|---|---|---|
| **Knock** | 10,000 messages. 1 message = 1 user × 1 channel. Branding stays on. No hard cap ([pricing][knock-pricing]). | Yes, a managed WebSocket ([feeds][knock-feeds]) | `@knocklabs/react`: popover, bell, feed, custom `renderItem` ([react feed][knock-react]) | Your user id, plus a server-signed RS256 JWT in enhanced security mode ([security][knock-sec]) | Yes. Email is another channel step, and it counts as another message. | No offline mode is documented. You need a Knock dev-environment key, or you mock it. |
| **Novu Cloud** | 10,000 workflow runs, 5 workflows, 3 seats, 24 h activity retention. Branding stays on ([pricing][novu-pricing]). | Yes. The Inbox syncs live through Novu's WS service ([inbox][novu-inbox], [self-host][novu-selfhost]). | `@novu/react` `<Inbox/>`: `renderNotification`, tabs filtered by tags/data/severity ([conditional display][novu-render]) | `subscriberId` plus an HMAC `subscriberHash` ([prod][novu-prod]) | Yes. Novu is multi-channel. | **Keyless `<Inbox/>`** for UI testing, with data expiring in 24 h ([setup][novu-setup]) |
| **Novu self-hosted (Community)** | No license fee. Code is MIT, with EE packages under a separate license ([repo][novu-repo]). | Yes. You run the WS service yourself. | Same Inbox. No snooze, and branding can't be removed ([diff][novu-diff]). | Same | Yes | Runs locally, but needs API + Worker + WS + Dashboard + **MongoDB + Redis + S3** ([self-host][novu-selfhost]) |
| **MagicBell** | **1,000 deliveries** ([pricing][mb-pricing]). Next tier is $249/mo for 50k. | Yes. The marketing page says "WebSockets" ([inbox][mb-inbox]). | `@magicbell/react`: `FloatingInbox`, `Inbox` with `ItemComponent` ([react][mb-react]) | A User JWT signed on your server ([react][mb-react]) | Yes. Multi-channel. | Nothing documented |
| **Courier** | 10,000 sends (Developer). Above that, Business bills $0.005 for **every** send, including the first 10k ([pricing][courier-pricing], [billing][courier-billing]). | Yes. "Messages arrive in real time" via `listenForUpdates()` ([overview][courier-inbox], [custom][courier-custom]) | `@trycourier/courier-react` v8+: `renderListItem`, and messages carry `data` and `tags` ([custom][courier-custom]) | `userId` plus a server-generated JWT ([overview][courier-inbox]) | Yes. A template routed to inbox **and** email counts as **one** send per recipient ([billing][courier-billing]). | Nothing documented |
| **Home-built** | $0, no limits | Polling (trivial) or SSE (about 100 extra lines, see below) | Built with the repo's own Radix/shadcn UI | The existing session cookie, `getCurrentUserId` | A Notification row and an email are independent. Fan-out is ours to write. | Fully offline. Testable with Vitest against SQLite. |

## Vendor details

### Knock
- **Pricing** ([knock.app/pricing][knock-pricing]):
  - Free is $0 for up to 10,000 messages a month. Starter is $250/mo for 50k, then $0.005 each.
  - A message is "A single message delivered to a single user on a single channel". In-app plus email therefore counts as 2.
  - Free keeps Knock branding and excludes i18n and per-tenant branding. Environments are unlimited, feed retention is unlimited, and logs are kept 30 days.
  - Knock says it does not hard-cap the free tier and contacts you about billing instead.
- **Realtime**: the client connects to a managed real-time service that "receives notifications over a websocket" ([feeds overview][knock-feeds]). There is an option to auto-disconnect sockets in inactive tabs.
- **Feed UI**: `KnockProvider`, `KnockFeedProvider`, `NotificationIconButton`, `NotificationFeedPopover`, `NotificationFeed`, `NotificationCell` ([react feed][knock-react]).
  - Overriding `renderItem` gives full control of each cell.
  - Styling uses `--rnf-*` CSS variables.
  - Feeds can be filtered by status or by custom properties, so a `role` field in the trigger `data` can drive a role label or filter.
- **Identity**: `user={{ id }}`.
  - Without enhanced security mode, "a request with your public key can act as any user" ([security][knock-sec]).
  - With it on, the server signs an RS256 JWT with `sub = userId`. Cadence's numeric `users.id` would work as the Knock user id.
- **Uncertain**: no local emulator or offline mode is documented. Tests would need to stub the Knock client.

### Novu (Cloud)
- **Pricing** ([novu.co/pricing][novu-pricing]):
  - Free is $0 for 10,000 workflow runs a month, with 5 workflows, 3 team members, 2 environments, 24 h activity-feed retention, and Novu branding.
  - Pro is from $30/mo for 30k runs (still 20 workflows), with overage at $1.20 per 1k.
  - **Uncertain**: the 24 h figure is *activity-feed* (observability log) retention. The pricing page does not say how long Inbox messages themselves are kept.
  - The **5-workflow cap** matters. Each Notification kind (refund decided, new question, enrollment, …) is typically its own workflow.
- **Realtime**: the Inbox "manages the real-time unread count" ([inbox overview][novu-inbox]). The self-host architecture lists a dedicated WS (WebSocket) service ([self-host][novu-selfhost]).
- **Feed UI**: `@novu/react` (React 18+, supports React 19).
  - `renderNotification` receives the full notification, including `notification.data` ([conditional display][novu-render]).
  - Tabs take `filter: { tags, data, severity }`, which could give per-role tabs (Student / Instructor) in one feed.
  - Headless hooks (`useNotifications`) are available for a fully custom UI.
- **Identity**: `subscriberId` plus `subscriberHash = HMAC-SHA256(secretKey, subscriberId)`, computed server-side ([prepare for production][novu-prod]). Without HMAC, someone who guesses another `subscriberId` could read that user's feed.
- **Local dev**: keyless `<Inbox />` works with no props for UI testing, and its data expires in 24 h ([setup][novu-setup]). It does not replace a real dev environment for end-to-end tests.

### Novu (self-hosted Community edition)
- **License**: the repo ships `LICENSE-MIT`, plus `LICENSE-ENTERPRISE` and `EE-PACKAGES-LICENSE` for enterprise packages ([novuhq/novu][novu-repo]). The latest release was v3.20.0 on 2026-11-16. The pricing page lists "Self-hosted" only under Enterprise. The Community edition is the OSS path ([diff][novu-diff]).
- **Gaps vs Cloud** ([self-hosted and cloud][novu-diff]):
  - No snooze.
  - Novu branding can't be removed, in either the Inbox or email.
  - No email activity tracking.
  - Retention depends on your infrastructure.
  - Inbox, Bell, Digest, and code-based workflows are all present.
- **Infrastructure** ([self-host overview][novu-selfhost]):
  - Services: API, Worker, WS, Dashboard, Redis, MongoDB, and S3-compatible storage.
  - A single-VM minimum is 4 vCPU / 8 GB, *plus* MongoDB, Redis, and storage.
  - That is far heavier than Cadence itself, which is one Node process and one SQLite file.

### MagicBell
- **Pricing** ([magicbell.com/pricing][mb-pricing]):
  - Builder is $0 for **1,000 deliveries** a month, the smallest free tier here. Startup is $249/mo for 50k, then $0.0025 each.
  - The FAQ says deliveries over the limit are "charged per use". It gives no Builder overage rate (**uncertain**).
  - The page does not say whether the free tier keeps branding.
- **Realtime**: the inbox marketing page says notifications "update live via WebSockets" ([inbox][mb-inbox]). The React docs don't name a transport.
- **Feed UI**: `@magicbell/react` with `Provider token=…`, `FloatingInbox`, and `Inbox` (whose `ItemComponent` prop allows a custom item) ([react][mb-react]). A headless SDK exists too ([headless][mb-headless]).
  - **Uncertain**: the docs pages read don't show which notification fields (category/topic/custom attributes) are available for a role label.
- **Identity**: a per-user JWT generated on your server ([react][mb-react]). HMAC was an older or alternative mode ([hmac][mb-hmac]).

### Courier
- **Pricing** ([courier.com/pricing][courier-pricing], [billing docs][courier-billing]):
  - Developer is free for 10,000 sends a month.
  - Going over means switching to Business at **$0.005 for every send, including the first 10,000**. That is a cliff: 10,001 sends costs about $50.
  - "One send is one template sent to one recipient". Inbox "has no fee of its own", and a template routed to inbox **and** email counts once. That is cheaper than Knock if email is added later.
- **Realtime**: "Messages arrive in real time on web and mobile" ([inbox overview][courier-inbox]). The SDK opens a realtime connection via `listenForUpdates()` ([custom inbox][courier-custom]). The transport isn't named in the v8 docs, though an older React SDK page calls it a WebSocket.
- **Feed UI**: `@trycourier/courier-react` (React 18+) ([inbox overview][courier-inbox]). The older `@trycourier/react-inbox` is deprecated.
  - `renderListItem={(props) => <MyRow message={props?.message} />}`.
  - Messages expose `title`, `body`, `data`, `tags`, `read`, `opened`, and `archived` ([custom inbox][courier-custom]).
- **Identity**: the backend mints a JWT with the Courier API key, and the client calls `signIn({ userId, jwt })` ([inbox overview][courier-inbox]).
- **Local dev**: nothing documented. You'd use a test workspace or a stub.

## Home-built on Cadence's stack

How it fits the existing code:

- **Identity is already solved.**
  - `app/lib/session.ts` keeps `userId` in the `cadence_session` cookie.
  - `getCurrentUserId(request)` gives the recipient on every request.
  - The DevUI switcher (`app/routes/api.switch-user.ts`) just rewrites that cookie.
  - The feed would follow the switched user with no extra work, apart from SSE reconnecting (see below).
- **Role label**: `UserRole` in `app/db/schema.ts` has only `student | instructor | admin`. Team Admin is a `teamMembers.role`, not a `UserRole`.
  - So a Notification needs its **own** role-label enum: Student / Instructor / Platform Admin / Team Admin.
  - That applies to vendors too, where the label would live in the payload `data`.
- **Feed placement**: `app/routes/layout.app.tsx` already loads `currentUser` for every app page and renders `Sidebar` and `DevUI`. An unread count can be added to that loader, and a bell/popover can go in `app/components/sidebar.tsx` using the existing Radix/shadcn primitives.

Size estimate (rough, not built):

| Piece | Approx. lines |
|---|---|
| `notifications` table (id, userId FK, roleLabel, kind, title, body, link, data JSON, createdAt, readAt) and a migration (see the `database-migrations` skill) | 20 |
| `app/lib/notifications.server.ts`: `notify()`, `listForUser()`, `unreadCount()`, `markRead()`, `markAllRead()` | 80 |
| Resource route for mark-read / mark-all-read actions (`useFetcher`, same pattern as `comment-thread.tsx`) | 40 |
| Bell + popover feed UI with role badges (DevUI already has a `RoleBadge` pattern) | 120–150 |
| Tests (Vitest) | 100+ |
| **Polling** realtime: `useRevalidator().revalidate()` on an interval or on window focus | ~15 |
| **SSE** realtime instead (see below) | ~100 |

### What SSE costs on this stack
- **Server side**:
  - An in-process `EventEmitter` keyed by userId, which `notify()` emits on (about 25 lines).
  - A resource route whose loader returns `new Response(ReadableStream, { headers: { "Content-Type": "text/event-stream" } })`. It sends a heartbeat comment every ~25 s and cleans up on `request.signal` abort (about 40 lines).
- **Client side**: a `useEventSource` hook in the app layout that calls `revalidate()` or bumps the count on each event (about 25 lines).
- **It works with the production server as-is**:
  - `@react-router/serve` puts `compression()` in front of the handler.
  - `@react-router/express` calls `res.flushHeaders()` for `text/event-stream`.
  - `@react-router/node` calls `flush()` after each chunk (`node_modules/@react-router/express/dist/index.js:63`, `node_modules/@react-router/node/dist/index.js:121`). Compression therefore doesn't buffer events.
- **Caveats**:
  1. **Single-server only.** The in-memory emitter only reaches clients on the same process. That matches today's single-server SQLite setup, but scaling out would need pub/sub (or a fallback to polling).
  2. **One long-lived connection per open tab.** Under HTTP/1.1, browsers cap about 6 connections per origin, so many tabs can starve normal requests. This mostly bites in local dev.
  3. **DevUI switching.** `EventSource` keeps the cookie it opened with. The hook must be keyed on `currentUser.id` so it reconnects after a switch. Vendor SDKs have the same issue: their provider must re-mount with the new user id or token.
  4. **Writes come only from this app**, so `notify()` can emit straight after the insert. There's no need to watch SQLite for changes.
- **Polling at a 30–60 s interval** costs almost nothing in code. On SQLite it means one indexed `count(*)` per user per interval. The trade-off is latency.

## Other observations

- **Email later**:
  - Every vendor is multi-channel, and email providers such as Postmark can be plugged in.
  - Billing differs. Knock counts each channel as a separate message. Courier counts a multi-channel template as one send. Novu counts workflow runs, so one run can fan out to several channels.
  - Home-built leaves email as a separate call next to `notify()`.
- **Map discrepancy**: map #1 says today's email goes through `app/lib/mailer.server.ts` (Postmark, `.outbox/` fallback). **That file does not exist in this checkout** (as of `61a14ba`), and nothing in `app/` references Postmark or `.outbox`. The refund route is `app/routes/courses.$slug.refund.ts`. Verify before relying on the mailer as a pattern.
- **Free-tier ranking by headroom**:
  - Knock, Novu, and Courier each give about 10k a month.
  - Novu's 5-workflow cap and Courier's pay-from-the-first-send cliff are the sharpest edges.
  - Knock's free tier is the least restricted on features (unlimited environments and feed retention).
  - MagicBell's 1k is an order of magnitude smaller.

[knock-pricing]: https://knock.app/pricing
[knock-react]: https://docs.knock.app/in-app-ui/react/feed
[knock-feeds]: https://docs.knock.app/in-app-ui/feeds/overview
[knock-sec]: https://docs.knock.app/in-app-ui/security-and-authentication
[novu-pricing]: https://novu.co/pricing
[novu-inbox]: https://docs.novu.co/platform/inbox/overview
[novu-render]: https://docs.novu.co/platform/inbox/advanced-customization/conditional-display
[novu-prod]: https://docs.novu.co/platform/inbox/prepare-for-production
[novu-setup]: https://docs.novu.co/platform/inbox/setup-inbox
[novu-selfhost]: https://docs.novu.co/community/self-hosting-novu/overview
[novu-diff]: https://docs.novu.co/community/self-hosted-and-novu-cloud
[novu-repo]: https://github.com/novuhq/novu
[mb-pricing]: https://www.magicbell.com/pricing
[mb-inbox]: https://magicbell.com/inbox
[mb-react]: https://magicbell.com/docs/libraries/react
[mb-headless]: https://magicbell.com/docs/libraries/react-headless
[mb-hmac]: https://magicbell.com/docs/hmac-authentication
[courier-pricing]: https://www.courier.com/pricing
[courier-billing]: https://www.courier.com/docs/workspaces/billing
[courier-inbox]: https://www.courier.com/docs/platform/inbox/inbox-overview
[courier-custom]: https://www.courier.com/docs/in-app/build-a-custom-inbox

# TanStack Router upstream reference

This native example is source-pinned to TanStack Router's Solid 2 file-based kitchen sink rather than relying on a behavioral or visual approximation.

- Repository: `TanStack/router`
- Pinned upstream revision: `b6984af74dd561b8ee7e2d7369898a536dda70c2`
- Source example: `examples/solid/kitchen-sink-solid-query-file-based`
- Upstream Solid runtime: `solid-js ^2.0.0-rc.1`, `@solidjs/web ^2.0.0-rc.1`
- Upstream router: `@tanstack/solid-router ^2.0.0-rc.1`
- License: MIT
- Vendored source: `../../upstream/tanstack-router/examples/solid/kitchen-sink-solid-query-file-based`

The pinned snapshot covers the visible root navigation and route owners, auth/profile guard, pathless layout routes, Expensive code-split route, Home/Login routes, Dashboard layout/index, Invoices layout/index/detail, Users layout/index/detail, `InvoiceFields`, `Spinner`, auth state, and the query/mock-data layer those routes use. `bun run source:check` verifies every vendored file against its upstream Git blob SHA.

## Native compatibility boundary

The source app already owns the visible route hierarchy and copy. The GPUIX port keeps only platform/runtime differences below that boundary:

- native route state replaces browser URL/history and TanStack Router internals;
- deterministic local fixtures replace JSONPlaceholder/query transport;
- GPUIX inputs and controls replace browser form/select elements;
- browser-only Solid Query and Router devtools are omitted;
- router-level compatibility state reproduces the upstream auth redirect and post-login destination behavior.

Those substitutions must not change the visible application hierarchy or invent substitute route content. The native root therefore starts on Home like the upstream `/` route; the Home invoice pill deep-links to invoice 3; Profile redirects through Login while logged out; pathless A/B preserve the source `Layout` wrapper and route copy; and Expensive preserves its source code-split demo copy.

The integration test acts as a change detector for those route semantics together with invoice create/edit/detail, user filter/sort/detail, and login behavior.

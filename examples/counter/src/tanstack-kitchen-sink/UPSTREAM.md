# TanStack Router upstream reference

This native example is now source-pinned to the Solid 2 file-based kitchen sink rather than relying on a behavioral/lookalike description.

- Repository: `TanStack/router`
- Pinned upstream revision: `b6984af74dd561b8ee7e2d7369898a536dda70c2`
- Source example: `examples/solid/kitchen-sink-solid-query-file-based`
- Upstream Solid runtime: `solid-js ^2.0.0-rc.1`, `@solidjs/web ^2.0.0-rc.1`
- Upstream router: `@tanstack/solid-router ^2.0.0-rc.1`
- License: MIT
- Vendored source: `../../upstream/tanstack-router/examples/solid/kitchen-sink-solid-query-file-based`

The pinned snapshot includes the root route, home/login routes, Dashboard layout/index, Invoices layout/index/detail, Users layout/index/detail, `InvoiceFields`, `Spinner`, and the query/mock-data layer those routes use. `bun run source:check` verifies every vendored file against its upstream Git blob SHA.

The GPUIX port keeps router/query/network/browser differences below the route/application boundary: native route state replaces URL history, deterministic local fixtures replace JSONPlaceholder transport, GPUIX controls replace browser form/select elements, and browser-only devtools are omitted. Those substitutions are compatibility concerns; they are not a reason to invent a different application hierarchy.

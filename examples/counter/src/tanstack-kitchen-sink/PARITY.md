# TanStack Solid 2 kitchen sink parity

This native fixture is adapted from the MIT-licensed TanStack Router Solid 2 RC kitchen sink.

- Repository: `TanStack/router`
- Branch used for discovery: `solid-router-v2-pre`
- Pinned upstream revision: `b6984af74dd561b8ee7e2d7369898a536dda70c2`
- Upstream example: `examples/solid/kitchen-sink-solid-query-file-based`
- Upstream Solid runtime: `solid-js ^2.0.0-rc.1`
- Upstream Router: `@tanstack/solid-router ^2.0.0-rc.1`

## Visual parity contract

The native fixture should preserve the upstream application's visible hierarchy, labels, spacing intent, and interaction states wherever GPUIX exposes an equivalent primitive.

| Upstream surface | Native parity target |
| --- | --- |
| `__root.tsx` | `Kitchen Sink` header, 224px route rail, route labels, content divider |
| `dashboard.route.tsx` | `Dashboard` heading and `Summary / Invoices / Users` navigation |
| `dashboard.index.tsx` | dashboard welcome copy and invoice count |
| `dashboard.invoices.route.tsx` | 192px invoice master list and detail outlet |
| `dashboard.invoices.index.tsx` | create-invoice form as the invoice index view |
| `dashboard.invoices.$invoiceId.tsx` | title/body editing, Show Notes, notes textarea, Save, success state |
| `dashboard.users.route.tsx` | gray sort/filter rows, full-width Sort By control, search input, user list/detail split |
| `dashboard.users.user.tsx` | bold user heading and JSON-like monospace detail |
| `index.tsx` | `Welcome Home!`, `1 New Invoice`, and explanatory copy |
| `styles.css` | light gray page background, gray borders, blue links/actions, gray utility rows |

## Native substitutions

These differences are intentional rather than visual redesigns:

- Browser `<select>` is implemented with GPUix Solid `Select`, `SelectTrigger`, `SelectValue`, and `SelectContent`.
- URL routing/search params are deterministic local route-shaped state because GPUIX is not a browser URL renderer.
- TanStack Query network transport is replaced with deterministic JSONPlaceholder-shaped local fixture data.
- DOM `<form>` submission is represented by native input/change/click handlers.
- TanStack Router/Solid Query browser devtools are omitted because they are browser tooling, not application UI.
- The browser sandbox's bottom-left range controls are not yet represented because GPUIX Solid does not currently expose a native range/slider primitive.
- The upstream light/dark `color-scheme` currently maps to the light presentation only in this fixture.

## Parity regression checks

The native integration test must check more than interaction success. Geometry-sensitive controls should have minimum bounds that reflect their upstream layout intent. In particular, the Users `Sort By` trigger must fill the remaining row width and visibly expose its selected value; this protects against a Select root collapsing to intrinsic size while still remaining clickable.

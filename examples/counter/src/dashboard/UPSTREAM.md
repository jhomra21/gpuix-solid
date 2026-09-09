# Dashboard upstream source

The native Dashboard fixture is a source-first port of the Solid application in:

- Repository: `jhomra21/cloudflare-workers-solid-tanstack-spa-betterauth-D1-KV`
- Commit: `47139f07c018dc2ba505bbb5915750fdba19e961`

This is the repository head that existed when the original GPUIX Solid dashboard dogfood PR (#40) was created. PR #40 explicitly described its fixture as being rebuilt from this application's UI/interaction ideas. PR #62 replaces that remake with a port that preserves the source application's route/component ownership and user-facing copy while isolating native/router/auth/network substitutions behind compatibility code.

## Dashboard source owners

The route files own page structure and behavior. The shell is additionally owned by the source `AppSidebar`, `Breadcrumbs`, and `NavUser` components rather than by an invented native navigation hierarchy.

| Source path | Git blob |
| --- | --- |
| `src/routes/dashboard.tsx` | `a5b372504c516f095027da8b58429d96c053fe9a` |
| `src/routes/dashboard/index.tsx` | `4f9419cf79aaedb3ff1ace3c7f412cbb63a9e3e9` |
| `src/routes/dashboard/account.tsx` | `3e8b00a7eb2e2c0fed5da0382a221eaa52b62e30` |
| `src/routes/dashboard/notes.tsx` | `8e77eff1e3f254b3ee0790fa68aa15948cc38156` |
| `src/routes/dashboard/tasks.tsx` | `85a895702e601880e45eb96b13e538019118488f` |
| `src/routes/dashboard/weather.tsx` | `a4949efee1342681547cfdff33a508d570948071` |
| `src/components/AppSidebar.tsx` | `80949145980cba001c270bff621d52e33947e587` |
| `src/components/Breadcrumbs.tsx` | `48c1b39917f1ac3d4991b01786f145b38978f58a` |
| `src/components/nav-user.tsx` | `735b7d3c449dd5835fd46b63dfc8e9d292d7d3a7` |

The native shell therefore keeps the source navigation set and ordering, inset/collapsible sidebar shape, source icon geometry used by those navigation entries, source breadcrumb rules, and the user trigger/menu contents. Browser router state, auth state, responsive/mobile services, Kobalte/shadcn primitives, Tailwind evaluation, and network calls remain compatibility concerns.

The Home route also preserves the source two-column desktop card arrangement and its green, purple, and blue left-edge accents instead of flattening the cards into a generic native style.

The port must not add application UI that is absent from these source owners merely to preserve the previous dogfood fixture. Unsupported browser/runtime concerns should be represented by native compatibility adapters or deterministic fixture data, not by redesigning the pages.

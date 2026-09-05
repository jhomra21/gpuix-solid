# Dashboard upstream source

The native Dashboard fixture is a source-first port of the Solid application in:

- Repository: `jhomra21/cloudflare-workers-solid-tanstack-spa-betterauth-D1-KV`
- Commit: `47139f07c018dc2ba505bbb5915750fdba19e961`

This is the repository head that existed when the original GPUIX Solid dashboard dogfood PR (#40) was created. PR #40 explicitly described its fixture as being rebuilt from this application's UI/interaction ideas. PR #62 replaces that remake with a port that preserves the source application's route/component ownership and user-facing copy while isolating native/router/auth/network substitutions behind compatibility code.

## Dashboard route sources

| Source path | Git blob |
| --- | --- |
| `src/routes/dashboard.tsx` | `a5b372504c516f095027da8b58429d96c053fe9a` |
| `src/routes/dashboard/index.tsx` | `4f9419cf79aaedb3ff1ace3c7f412cbb63a9e3e9` |
| `src/routes/dashboard/account.tsx` | `3e8b00a7eb2e2c0fed5da0382a221eaa52b62e30` |
| `src/routes/dashboard/notes.tsx` | `8e77eff1e3f254b3ee0790fa68aa15948cc38156` |
| `src/routes/dashboard/tasks.tsx` | `85a895702e601880e45eb96b13e538019118488f` |
| `src/routes/dashboard/weather.tsx` | `a4949efee1342681547cfdff33a508d570948071` |

The port must not add application UI that is absent from these source routes merely to preserve the previous dogfood fixture. Unsupported browser/runtime concerns should be represented by native compatibility adapters or deterministic fixture data, not by redesigning the pages.

# solid-gpui parity notes

GPUix Solid uses [heyhuynhgiabuu/solid-gpui](https://github.com/heyhuynhgiabuu/solid-gpui) as a reference for useful Solid-on-GPUI ergonomics. The two projects have different native architectures, so this is a capability map rather than a requirement to copy APIs or protocol design.

| Capability | GPUix Solid status | Notes |
| --- | --- | --- |
| Select / combobox | Available | Solid-native controlled components already ship in `gpuix-solid`. |
| Tooltips / anchored overlays | Available | Solid-native floating components already ship. |
| Native animation | Available | `animate.div` targets GPUIX native motion. |
| Dialogs / shell integration | Available | Open/save/message and system open/reveal landed with desktop integration. |
| Native file drops | Available | Finder / OS file paths are exposed through `onFileDrop`. |
| Internal drag and drop | Available | Semantic payloads, full-element previews, exact placement, and rejected-drop return animation. |
| Utility classes | In progress in #96 | Built-in strict subset for apps that do not install a generated native style manifest. |
| CSS-familiar layout shorthands | In progress in #96 | `paddingX/Y`, `marginX/Y`, `size`, and inset shorthands expand before native delivery. |
| Window title / activation | In progress in #96 | Thin wrappers around the two imperative GPUIX 0.9 window methods. |
| Retained-list commands | In progress in #96 | Public wrappers for native scroll and item positioning. |
| Runtime hyperscript `h()` | In progress in #96 | Low-level JSX-free authoring helper with reactive children and selected accessor props. |
| Dynamic intrinsic/component helper | In progress in #96 | Universal `Dynamic` switches intrinsic tags or Solid components without depending on `solid-js/web`. |
| Window-scoped semantic `theme.set` | Native gap | GPUIX 0.9 exposes per-element `GpuixTheme` for native rich-content elements, not solid-gpui's window-scoped surface/foreground command. |
| Minimize / zoom / fullscreen commands | Native gap | GPUIX 0.9 has creation-time window options but no matching imperative renderer methods. |
| Custom native app menus | Native gap | GPUIX 0.9 owns its default native menus but does not expose arbitrary menu replacement through the renderer contract. |
| Recorded canvas draw lists | Native gap | Current GPUIX public surface does not provide solid-gpui's retained draw-list canvas contract. |
| Arbitrary styled text runs | Native gap | Current GPUIX public text contract does not expose a general per-run rich-text payload. |

## Rules for bringing features over

1. Prefer a thin Solid helper when GPUIX already has the native capability.
2. Compile authoring conveniences into the existing host contract when semantics are exact enough to test.
3. Keep generated source/style manifests authoritative for source-pinned ports.
4. Refuse unsupported tokens or features instead of silently approximating them.
5. Do not add a GPUix Solid API that pretends a missing GPUIX native capability exists.

This keeps portability work useful without turning compatibility code into a second renderer.

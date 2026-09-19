# solid-gpui parity notes

GPUix Solid uses independent Solid-on-GPUI implementations as ergonomics and capability references, not as native protocol authorities. The current focused audit includes [lxsmnsyc/solid-gpui](https://github.com/lxsmnsyc/solid-gpui) at exact SHA `196aa6edc779cb39f37a3ade4517ed197ad58813` and the earlier [heyhuynhgiabuu/solid-gpui](https://github.com/heyhuynhgiabuu/solid-gpui) reference. Both own different native architectures from GPUix Solid, which deliberately stays on the published GPUIX contract.

| Capability | GPUix Solid status | Notes |
| --- | --- | --- |
| Select / combobox | Available | Solid-native controlled components already ship in `gpuix-solid`. |
| Tooltips / anchored overlays | Available | Solid-native floating components already ship. |
| Native animation | Available | `animate.div` targets GPUIX native motion. |
| Dialogs / shell integration | Available | Open/save/message and system open/reveal landed with desktop integration. |
| Native file drops | Available | Finder / OS file paths are exposed through `onFileDrop`. |
| Internal drag and drop | Available | Semantic payloads, full-element previews, exact placement, and rejected-drop return animation. |
| Utility classes | Available | Built-in strict subset for apps that do not install a generated native style manifest. |
| CSS-familiar layout shorthands | Available | `paddingX/Y`, `marginX/Y`, `size`, and inset shorthands expand before native delivery. |
| Window title / activation | Available | Thin wrappers around the two imperative GPUIX 0.9 window methods. |
| Retained-list commands | Available | Public wrappers for native scroll and item positioning. |
| Runtime hyperscript `h()` | Available | Low-level JSX-free authoring helper with reactive children and selected accessor props. |
| First-party Vite helper | Available in next release | `gpuix-solid/vite` owns the qualified universal compiler, live client conditions, Solid bundling, and native-addon externalization contract. |
| Solid server-runtime guard | Available in next release | `render()` verifies that Solid effects rerun and fails with actionable Vite guidance when Node/Bun resolved the server build. |
| Dynamic intrinsic/component helper | Deferred | Solid 2 root replacement semantics need a dedicated retained-root change before this can be exposed safely. |
| Native GPUI key bindings | Native gap | `lxsmnsyc/solid-gpui` demonstrates a useful `keys` API backed by GPUI actions/keymaps; GPUIX 0.9 does not publish that contract. |
| Group hover / active state | Native gap | The audited renderer exposes ancestor group state directly; GPUIX 0.9 exposes element hover/active state but not the ancestor relationship needed for Tailwind `group-*`. |
| Generic element resize event | Native gap | The audited renderer implements `onResize` in its own host; GPUix Solid has bounds/query infrastructure but no published GPUIX resize subscription. |
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

## Architectural non-goals

The `lxsmnsyc/solid-gpui` process split, newline-delimited positional JSON protocol, custom Rust host, global session, one-window-per-process ownership, and platform-specific host binary packages solve problems created by bypassing GPUIX. GPUix Solid should not adopt those mechanisms while GPUIX already owns the native renderer boundary.

Ideas that require new native behavior should become focused GPUIX changes with native tests and evidence first, then thin Solid bindings.

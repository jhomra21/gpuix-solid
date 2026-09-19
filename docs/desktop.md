# Desktop and native integration

GPUix Solid exposes desktop helpers only where there is a tested native or operating-system path. The API deliberately reports native gaps instead of emulating unsupported GPUIX window behavior.

## Dialogs

```ts
import { dialog } from "gpuix-solid"

const files = await dialog.openFile({ multiple: true })
const destination = await dialog.saveFile({ suggestedName: "project.json" })
const answer = await dialog.message({
  message: "Discard changes?",
  detail: "Unsaved edits will be lost.",
  level: "warning",
  buttons: ["Cancel", "OK"],
})
```

macOS uses system dialog services, Windows uses the platform dialog APIs through PowerShell, and Linux uses `zenity`. Unsupported platform/tool combinations throw `DesktopUnsupportedError`.

The current message helper intentionally supports the small button shapes its cross-platform implementation has qualified rather than claiming arbitrary native dialog actions.

## Shell

```ts
import { shell } from "gpuix-solid"

await shell.revealPath("/tmp/project.json")
await shell.openWithSystem("https://github.com/remorses/gpuix")
```

System open/reveal maps to the operating system's normal mechanism.

## Window actions

```ts
import { appWindow } from "gpuix-solid"

appWindow.setTitle(renderer, "Renamed")
appWindow.activate(renderer)
```

GPUIX 0.9 exposes imperative title and activation operations. It does not expose matching imperative minimize, zoom, or fullscreen-toggle methods, so GPUix Solid publishes `supportsMinimize`, `supportsZoom`, and `supportsFullscreenToggle` as false instead of inventing fallback behavior.

Window creation options such as initial size, appearance, titlebar behavior, and fullscreen state remain `render()` options.

## Application menu

```ts
import { appMenu, render } from "gpuix-solid"

render(() => <App />, {
  title: "My App",
  ...appMenu.default("My App"),
})
```

GPUIX owns the native macOS application/window menus and currently exposes the application label. Arbitrary custom native menu items are not part of the 0.9 renderer contract; `appMenu.supportsCustomItems` is false.

## Retained list commands

```ts
import { list } from "gpuix-solid"

list.scrollToItem(renderer, listRef.id, 200)
const offset = list.getScrollOffset(renderer, listRef.id)
```

The `list` helper is a thin wrapper over GPUIX retained-list operations. It takes the native element id exposed by a host ref and fails explicitly when the renderer does not provide the requested command.

## What belongs upstream

Native keymap bindings, custom application menus, minimize/zoom/fullscreen commands, generic bounds-change events, group interaction state, arbitrary rich-text runs, and a general retained canvas draw-list API are useful GPUI capabilities demonstrated by other Solid-on-GPUI work.

GPUix Solid should add those only after the GPUIX native contract exposes them. See [solid-gpui parity notes](./solid-gpui-parity.md) for the capability audit.

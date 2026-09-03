from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"anchor missing in {path}: {old[:160]!r}")
    file.write_text(text.replace(old, new, 1))


# The copied Compressor and Knob use standard SVG attributes that Solid's
# narrow native child surface did not list yet. The serializer already preserves
# these names verbatim, so this is type-surface parity rather than DAW logic.
for path in [
    "packages/solid1/jsx-runtime.d.ts",
    "packages/solid/jsx-runtime.d.ts",
]:
    replace_once(
        path,
        '''  preserveAspectRatio?: string | undefined
  href?: string | undefined
''',
        '''  preserveAspectRatio?: string | undefined
  patternUnits?: string | undefined
  pathLength?: string | number | undefined
  href?: string | undefined
''',
    )

# TypeScript 5.9's DOM lib predates PointerEvent.persistentDeviceId, while the
# pinned browser source already uses the standardized field. Publish the field
# through both JSX entrypoints so source compiles without casts or source edits.
for path in [
    "packages/solid1/jsx-runtime.d.ts",
    "packages/solid/jsx-runtime.d.ts",
]:
    replace_once(
        path,
        '''import type''',
        '''declare global {
  interface PointerEvent {
    readonly persistentDeviceId: number
  }
}

import type''',
    )

# Native GPUIX currently has no persistent pointing-device identifier. Browser
# semantics define 0 as the uninitialized/unavailable value, and upstream then
# correctly falls back to pointerType. Add that same value to target, global,
# and handler payload events in both host generations.
for path in [
    "packages/solid1/src/host/events.ts",
    "packages/solid/src/host/events.ts",
]:
    replace_once(
        path,
        '''const POINTER_ID = 0
const DOUBLE_CLICK_MS = 500
''',
        '''const POINTER_ID = 0
const PERSISTENT_DEVICE_ID = 0
const DOUBLE_CLICK_MS = 500
''',
    )
    replace_once(
        path,
        '''    pointerId: POINTER_ID,
    pointerType: "mouse",
    shiftKey:''',
        '''    pointerId: POINTER_ID,
    pointerType: "mouse",
    persistentDeviceId: PERSISTENT_DEVICE_ID,
    shiftKey:''',
    )
    replace_once(
        path,
        '''    pointerId: { configurable: true, value: event.pointerId ?? POINTER_ID },
    pointerType: { configurable: true, value: event.pointerType ?? "mouse" },
    button:''',
        '''    pointerId: { configurable: true, value: event.pointerId ?? POINTER_ID },
    pointerType: { configurable: true, value: event.pointerType ?? "mouse" },
    persistentDeviceId: { configurable: true, value: event.persistentDeviceId ?? PERSISTENT_DEVICE_ID },
    button:''',
    )
    replace_once(
        path,
        '''    pointerId: { configurable: true, value: event.pointerId ?? POINTER_ID },
    pointerType: { configurable: true, value: event.pointerType ?? "mouse" },
    button:''',
        '''    pointerId: { configurable: true, value: event.pointerId ?? POINTER_ID },
    pointerType: { configurable: true, value: event.pointerType ?? "mouse" },
    persistentDeviceId: { configurable: true, value: event.persistentDeviceId ?? PERSISTENT_DEVICE_ID },
    button:''',
    )

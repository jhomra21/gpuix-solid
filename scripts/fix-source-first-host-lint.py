from pathlib import Path


def replace_required(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"{path}: missing {label}")
    path.write_text(text.replace(old, new, 1))


for package in ("solid", "solid1"):
    events = Path(f"packages/{package}/src/host/events.ts")
    text = events.read_text()
    old_payload = "  const payload = Object.assign({}, event, {\n"
    if "SAFETY: EventPayload is the native event plus the DOM-compatible fields" not in text:
        text = text.replace(
            old_payload,
            "  // SAFETY: EventPayload is the native event plus the DOM-compatible fields constructed below.\n" + old_payload,
            1,
        )
    old_synthetic = '''    const synthetic = previous
      ? { ...previous, elementId }
      : ({ elementId, eventType: "mouseMove", x: 0, y: 0 } as NativeEventPayload)
'''
    new_synthetic = '''    const fallbackSynthetic = {
      elementId,
      eventType: "mouseMove",
      x: 0,
      y: 0,
    } satisfies NativeEventPayload
    const synthetic = previous
      ? { ...previous, elementId }
      : fallbackSynthetic
'''
    if old_synthetic not in text and new_synthetic not in text:
        raise SystemExit(f"{events}: synthetic fallback anchor missing")
    text = text.replace(old_synthetic, new_synthetic, 1)
    events.write_text(text)

    nodes = Path(f"packages/{package}/src/host/nodes.ts")
    text = nodes.read_text()
    text = text.replace("  get dataset(): Record<string, string> {", "  get dataset() {", 1)
    old_closest = '''  closest(selector: string): HostElementNode | null {
    let current: HostElementNode | null = this
    while (current) {
      if (current.matches(selector)) return current
      current = current.parentElement
    }
    return null
  }
'''
    new_closest = '''  closest(selector: string): HostElementNode | null {
    if (this.matches(selector)) return this
    let current = this.parentElement
    while (current) {
      if (current.matches(selector)) return current
      current = current.parentElement
    }
    return null
  }
'''
    if old_closest not in text and new_closest not in text:
        raise SystemExit(f"{nodes}: closest anchor missing")
    text = text.replace(old_closest, new_closest, 1)
    old_dispatch = '''    for (const listener of [...(this.#eventListeners.get(event.type) ?? [])]) {
      if (typeof listener === "function") listener.call(this, event)
      else listener.handleEvent(event)
    }
'''
    new_dispatch = '''    for (const listener of this.#eventListeners.get(event.type) ?? []) {
      if (listener instanceof Function) listener.call(this, event)
      else listener.handleEvent(event)
    }
'''
    if old_dispatch not in text and new_dispatch not in text:
        raise SystemExit(f"{nodes}: event listener dispatch anchor missing")
    text = text.replace(old_dispatch, new_dispatch, 1)
    text = text.replace("  previous?: T,\n", "  _previous?: T,\n", 1)
    nodes.write_text(text)

context = Path("packages/solid1/src/kobalte/context-menu.tsx")
text = context.read_text()
old = '''function asContextMenuDomEvent(event: EventPayload): ContextMenuDomEvent {
  // Host JSX handlers receive the EventRegistry-normalized DOM-compatible payload.
  return event as ContextMenuDomEvent
}
'''
new = '''function asContextMenuDomEvent(event: EventPayload): ContextMenuDomEvent {
  // SAFETY: EventRegistry normalizes Host JSX events with preventDefault and stopPropagation before handlers run.
  return event as ContextMenuDomEvent
}
'''
if old not in text and new not in text:
    raise SystemExit("context-menu DOM event assertion anchor missing")
context.write_text(text.replace(old, new, 1))

parity = Path("packages/solid1/scripts/check-host-parity.ts")
text = parity.read_text().replace(
    '} as Parameters<EventRegistry["dispatch"]>[0])',
    '} satisfies Parameters<EventRegistry["dispatch"]>[0])',
).replace(
    '} as Parameters<EventRegistry["dispatch"]>[0]\n',
    '} satisfies Parameters<EventRegistry["dispatch"]>[0]\n',
)
parity.write_text(text)

menubar = Path("packages/solid1/src/kobalte/menubar.tsx")
text = menubar.read_text().replace("  popupBaseStyle,\n", "", 1)
menubar.write_text(text)

web = Path("packages/solid1/src/web.ts")
text = web.read_text().replace('import type { EventPayload as NativeEventPayload } from "@gpuix/native"\n', "", 1)
text = text.replace('import { EventRegistry } from "./host/events.js"\n', "", 1)
web.write_text(text)

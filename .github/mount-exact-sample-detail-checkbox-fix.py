from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

for relative in ["packages/solid1/src/host/types.ts", "packages/solid/src/host/types.ts"]:
    path = ROOT / relative
    text = path.read_text()
    anchor = '''export type DomCompatTarget = EventTarget & {
  value: string
  scrollTop: number
'''
    replacement = '''export type DomCompatTarget = EventTarget & {
  value: string
  checked: boolean
  getAttribute: (name: string) => string | null
  scrollTop: number
'''
    if replacement not in text:
        if anchor not in text:
            raise SystemExit(f"DomCompatTarget anchor missing in {relative}")
        text = text.replace(anchor, replacement, 1)
    path.write_text(text)

for relative in ["packages/solid1/src/host/nodes.ts", "packages/solid/src/host/nodes.ts"]:
    path = ROOT / relative
    text = path.read_text()
    anchor = '''  set value(value: string) {
    setHostProperty(this, "value", value)
  }

  focus(): void {
'''
    replacement = '''  set value(value: string) {
    setHostProperty(this, "value", value)
  }

  get checked(): boolean {
    return this.props.get("checked") === true
  }

  set checked(value: boolean) {
    setHostProperty(this, "checked", Boolean(value))
  }

  focus(): void {
'''
    if "get checked(): boolean" not in text:
        if anchor not in text:
            raise SystemExit(f"checked property anchor missing in {relative}")
        text = text.replace(anchor, replacement, 1)
    path.write_text(text)

for relative in ["packages/solid1/src/host/events.ts", "packages/solid/src/host/events.ts"]:
    path = ROOT / relative
    text = path.read_text()
    fallback_anchor = '''  return {
    value: event.value ?? "",
    scrollTop: 0,
'''
    fallback_replacement = '''  return {
    value: event.value ?? "",
    checked: false,
    getAttribute: () => null,
    scrollTop: 0,
'''
    if "checked: false," not in text:
        if fallback_anchor not in text:
            raise SystemExit(f"fallback target anchor missing in {relative}")
        text = text.replace(fallback_anchor, fallback_replacement, 1)

    click_anchor = '''      case "click": {
        if (!this.#nativePointerDown.has(event.elementId)) {
          this.#dispatchDom(event.elementId, "pointerDown", event, true)
        }
        this.#dispatchDom(event.elementId, "click", event)
        this.#maybeDispatchDoubleClick(event)
        return
      }
'''
    click_replacement = '''      case "click": {
        if (!this.#nativePointerDown.has(event.elementId)) {
          this.#dispatchDom(event.elementId, "pointerDown", event, true)
        }
        const target = this.#targets.get(event.elementId)
        const checkbox = target?.getAttribute("type")?.toLowerCase() === "checkbox" ? target : undefined
        const previousChecked = checkbox?.checked
        if (checkbox) checkbox.checked = !checkbox.checked
        const clickEvent = this.#dispatchDom(event.elementId, "click", event)
        if (checkbox && previousChecked !== undefined) {
          if (clickEvent?.defaultPrevented) {
            checkbox.checked = previousChecked
          } else {
            this.#dispatchDom(event.elementId, "input", event)
            this.#dispatchDom(event.elementId, "change", event)
          }
        }
        this.#maybeDispatchDoubleClick(event)
        return
      }
'''
    if "const checkbox = target?.getAttribute" not in text:
        if click_anchor not in text:
            raise SystemExit(f"checkbox click anchor missing in {relative}")
        text = text.replace(click_anchor, click_replacement, 1)
    path.write_text(text)

parity_path = ROOT / "packages/solid1/scripts/check-host-parity.ts"
parity = parity_path.read_text()
anchor = '''const doubleClickRegistry = new EventRegistry()
'''
test = '''const checkboxRegistry = new EventRegistry()
const checkboxTarget = createHostElement("input", "input")
setHostProperty(checkboxTarget, "type", "checkbox")
setHostProperty(checkboxTarget, "checked", false)
checkboxRegistry.activate(4)
checkboxRegistry.setTarget(4, checkboxTarget)
const checkboxEvents: string[] = []
checkboxRegistry.set(4, "click", (event) => checkboxEvents.push(`click:${String(event.currentTarget?.checked)}`))
checkboxRegistry.set(4, "input", (event) => checkboxEvents.push(`input:${String(event.currentTarget?.checked)}`))
checkboxRegistry.set(4, "change", (event) => checkboxEvents.push(`change:${String(event.currentTarget?.checked)}`))
checkboxRegistry.dispatch({ elementId: 4, eventType: "click", button: 0 } satisfies Parameters<EventRegistry["dispatch"]>[0])
if (!checkboxTarget.checked) throw new Error("checkbox click must toggle currentTarget.checked before handlers run")
if (checkboxEvents.join(",") !== "click:true,input:true,change:true") {
  throw new Error(`checkbox click must emit browser-order click/input/change with toggled checked state: ${checkboxEvents.join(",")}`)
}
checkboxRegistry.set(4, "click", (event) => event.preventDefault?.())
checkboxRegistry.dispatch({ elementId: 4, eventType: "click", button: 0 } satisfies Parameters<EventRegistry["dispatch"]>[0])
if (!checkboxTarget.checked) throw new Error("prevented checkbox click must restore the previous checked state")
if (checkboxEvents.join(",") !== "click:true,input:true,change:true") {
  throw new Error("prevented checkbox click must not emit input/change")
}

const doubleClickRegistry = new EventRegistry()
'''
if "checkbox click must toggle currentTarget.checked" not in parity:
    if anchor not in parity:
        raise SystemExit("host parity checkbox test anchor missing")
    parity = parity.replace(anchor, test, 1)
parity_path.write_text(parity)

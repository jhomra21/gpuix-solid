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

    checked_anchor = '''  set value(value: string) {
    setHostProperty(this, "value", value)
  }

  focus(): void {
'''
    checked_replacement = '''  set value(value: string) {
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
        if checked_anchor not in text:
            raise SystemExit(f"checked property anchor missing in {relative}")
        text = text.replace(checked_anchor, checked_replacement, 1)

    event_anchor = '''  const eventType = EVENT_PROP_TO_TYPE.get(name)
  if (eventType) {
    const previousPointerEvents = effectivePointerEvents(node)
    const nativeEventType = nativeEventTypeForDomEvent(eventType)
    const hadNativeHandler = nativeEventType ? hasNativeEventHandler(node, nativeEventType) : false
    const handler = isHostEventHandler(value) ? value : undefined
'''
    event_replacement = '''  const eventType = EVENT_PROP_TO_TYPE.get(name)
  if (eventType) {
    const previousPointerEvents = effectivePointerEvents(node)
    const nativeEventType = nativeEventTypeForDomEvent(eventType)
    const hadNativeHandler = nativeEventType ? hasNativeEventHandler(node, nativeEventType) : false
    const hadNativeClickHandler = hasNativeEventHandler(node, "click")
    const handler = isHostEventHandler(value) ? value : undefined
'''
    if "const hadNativeClickHandler = hasNativeEventHandler(node, \"click\")" not in text:
        if event_anchor not in text:
            raise SystemExit(f"event registration anchor missing in {relative}")
        text = text.replace(event_anchor, event_replacement, 1)

    listener_anchor = '''    if (nativeEventType) {
      const hasNativeHandler = hasNativeEventHandler(node, nativeEventType)
      if (hadNativeHandler != hasNativeHandler) {
        node.root.driver.enqueue("setEventListener", node.id, nativeEventType, hasNativeHandler)
      }
    }

    const nextPointerEvents = effectivePointerEvents(node)
'''
    listener_replacement = '''    if (nativeEventType) {
      const hasNativeHandler = hasNativeEventHandler(node, nativeEventType)
      if (hadNativeHandler != hasNativeHandler) {
        node.root.driver.enqueue("setEventListener", node.id, nativeEventType, hasNativeHandler)
      }
    }
    if (nativeEventType !== "click") {
      const hasNativeClickHandler = hasNativeEventHandler(node, "click")
      if (hadNativeClickHandler !== hasNativeClickHandler) {
        node.root.driver.enqueue("setEventListener", node.id, "click", hasNativeClickHandler)
      }
    }

    const nextPointerEvents = effectivePointerEvents(node)
'''
    if "if (nativeEventType !== \"click\")" not in text:
        if listener_anchor not in text:
            raise SystemExit(f"checkbox listener update anchor missing in {relative}")
        text = text.replace(listener_anchor, listener_replacement, 1)

    prop_anchor = '''  const previousPointerEvents = name === "role" ? effectivePointerEvents(node) : undefined
  if (value === undefined) node.props.delete(name)
  else node.props.set(name, customPropValue(value))

  if (name === "type" && node.tagName === "INPUT" && !node.nativeAlive) {
'''
    prop_replacement = '''  const previousPointerEvents = name === "role" ? effectivePointerEvents(node) : undefined
  const previousTypeClickHandler = name === "type" ? hasNativeEventHandler(node, "click") : false
  if (value === undefined) node.props.delete(name)
  else node.props.set(name, customPropValue(value))

  if (name === "type" && node.tagName === "INPUT" && !node.nativeAlive) {
'''
    if "const previousTypeClickHandler" not in text:
        if prop_anchor not in text:
            raise SystemExit(f"checkbox type listener anchor missing in {relative}")
        text = text.replace(prop_anchor, prop_replacement, 1)

    role_anchor = '''  if (node.root && node.nativeAlive && name === "role") {
    const nextPointerEvents = effectivePointerEvents(node)
    if (previousPointerEvents !== nextPointerEvents) {
      node.root.driver.enqueue("setStyle", node.id, nativeStyleFor(node, nextPointerEvents))
      appliedPointerEvents.set(node, nextPointerEvents)
    }
  }
  if (!node.root || !node.nativeAlive || isReserved(name)) return
'''
    role_replacement = '''  if (node.root && node.nativeAlive && name === "role") {
    const nextPointerEvents = effectivePointerEvents(node)
    if (previousPointerEvents !== nextPointerEvents) {
      node.root.driver.enqueue("setStyle", node.id, nativeStyleFor(node, nextPointerEvents))
      appliedPointerEvents.set(node, nextPointerEvents)
    }
  }
  if (node.root && node.nativeAlive && name === "type") {
    const nextTypeClickHandler = hasNativeEventHandler(node, "click")
    if (previousTypeClickHandler !== nextTypeClickHandler) {
      node.root.driver.enqueue("setEventListener", node.id, "click", nextTypeClickHandler)
    }
  }
  if (!node.root || !node.nativeAlive || isReserved(name)) return
'''
    if "const nextTypeClickHandler" not in text:
        if role_anchor not in text:
            raise SystemExit(f"mounted checkbox type listener anchor missing in {relative}")
        text = text.replace(role_anchor, role_replacement, 1)

    adopt_anchor = '''    for (const [eventType, handler] of node.events) {
      root.events.set(node.id, eventType, handler)
      const nativeEventType = nativeEventTypeForDomEvent(eventType)
      if (nativeEventType) nativeEventTypes.add(nativeEventType)
    }
    for (const eventType of nativeEventTypes) {
'''
    adopt_replacement = '''    for (const [eventType, handler] of node.events) {
      root.events.set(node.id, eventType, handler)
      const nativeEventType = nativeEventTypeForDomEvent(eventType)
      if (nativeEventType) nativeEventTypes.add(nativeEventType)
    }
    if (hasCheckboxActivationHandler(node)) nativeEventTypes.add("click")
    for (const eventType of nativeEventTypes) {
'''
    if "if (hasCheckboxActivationHandler(node)) nativeEventTypes.add(\"click\")" not in text:
        if adopt_anchor not in text:
            raise SystemExit(f"checkbox adoption listener anchor missing in {relative}")
        text = text.replace(adopt_anchor, adopt_replacement, 1)

    helper_anchor = '''function hasNativeEventHandler(node: HostElementNode, nativeEventType: string): boolean {
  for (const eventType of node.events.keys()) {
    if (nativeEventTypeForDomEvent(eventType) === nativeEventType) return true
  }
  return false
}
'''
    helper_replacement = '''function hasCheckboxActivationHandler(node: HostElementNode): boolean {
  return node.tagName === "INPUT" &&
    String(node.props.get("type") ?? "").toLowerCase() === "checkbox" &&
    (node.events.has("change") || node.events.has("input"))
}

function hasNativeEventHandler(node: HostElementNode, nativeEventType: string): boolean {
  if (nativeEventType === "click" && hasCheckboxActivationHandler(node)) return true
  for (const eventType of node.events.keys()) {
    if (nativeEventTypeForDomEvent(eventType) === nativeEventType) return true
  }
  return false
}
'''
    if "function hasCheckboxActivationHandler" not in text:
        if helper_anchor not in text:
            raise SystemExit(f"checkbox native handler helper anchor missing in {relative}")
        text = text.replace(helper_anchor, helper_replacement, 1)

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

prop_path = ROOT / "packages/solid/test/prop-parity.test.ts"
prop = prop_path.read_text()
close_anchor = '''  it("forwards custom-element values and serializes unsupported values as null", () => {
'''
subscription_test = '''  it("subscribes checkbox change handlers to native click activation", () => {
    const { renderer, driver, root } = fixture()
    const node = createHostElement("input", "input")

    setHostProperty(node, "type", "checkbox", undefined)
    setHostProperty(node, "onChange", () => {}, undefined)
    insertHostNode(root, node)
    driver.flush()

    expect(renderer.batches[0]).toEqual([
      ["createElement", 1, "input"],
      ["setEventListener", 1, "change", true],
      ["setEventListener", 1, "click", true],
      ["setCustomProp", 1, "type", "checkbox"],
      ["setRoot", 1],
    ])

    setHostProperty(node, "onChange", undefined, () => {})
    driver.flush()
    expect(renderer.batches.at(-1)).toEqual([
      ["setEventListener", 1, "change", false],
      ["setEventListener", 1, "click", false],
      ["setStyle", 1, {}],
    ])
  })

  it("forwards custom-element values and serializes unsupported values as null", () => {
'''
if "subscribes checkbox change handlers to native click activation" not in prop:
    if close_anchor not in prop:
        raise SystemExit("checkbox prop parity insertion anchor missing")
    prop = prop.replace(close_anchor, subscription_test, 1)
prop_path.write_text(prop)

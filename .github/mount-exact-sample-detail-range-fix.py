from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

for relative in ["packages/solid1/src/host/nodes.ts", "packages/solid/src/host/nodes.ts"]:
    path = ROOT / relative
    text = path.read_text()

    forward_anchor = '''function isForwardedBuiltInProp(node: HostElementNode, name: string): boolean {
  return UNIVERSAL_PROPS.has(name) || name === "hidden" || name === "role" ||
    (node.localName === "select" && name === "value") || name.startsWith("aria-")
}
'''
    forward_replacement = '''const RANGE_INPUT_PROPS = new Set(["type", "min", "max", "step", "value", "disabled"])

function isRangeInput(node: HostElementNode): boolean {
  return node.localName === "input" && String(node.props.get("type") ?? "").toLowerCase() === "range"
}

function isForwardedBuiltInProp(node: HostElementNode, name: string): boolean {
  return UNIVERSAL_PROPS.has(name) || name === "hidden" || name === "role" ||
    (node.localName === "select" && name === "value") ||
    (isRangeInput(node) && RANGE_INPUT_PROPS.has(name)) || name.startsWith("aria-")
}
'''
    if "const RANGE_INPUT_PROPS" not in text:
        if forward_anchor not in text:
            raise SystemExit(f"range forwarding anchor missing in {relative}")
        text = text.replace(forward_anchor, forward_replacement, 1)

    style_anchor = '''function nativeStyleFor(
  node: HostElementNode,
  pointerEvents = effectivePointerEvents(node),
): StyleDesc {
  if (node.style.pointerEvents !== undefined || pointerEvents === undefined) return node.style
  return { ...node.style, pointerEvents }
}
'''
    style_replacement = '''function nativeStyleFor(
  node: HostElementNode,
  pointerEvents = effectivePointerEvents(node),
): StyleDesc {
  // Browser range inputs have an intrinsic hit surface even without author CSS.
  // GPUIX intentionally backs them with a div, so preserve a small intrinsic
  // height and let normal flex layout determine the available width.
  const style = isRangeInput(node)
    ? { minHeight: 16, height: 16, width: "100%", ...node.style }
    : node.style
  if (node.style.pointerEvents !== undefined || pointerEvents === undefined) return style
  return { ...style, pointerEvents }
}
'''
    if "Browser range inputs have an intrinsic hit surface" not in text:
        if style_anchor not in text:
            raise SystemExit(f"range intrinsic style anchor missing in {relative}")
        text = text.replace(style_anchor, style_replacement, 1)

    event_snapshot_anchor = '''    const nativeEventType = nativeEventTypeForDomEvent(eventType)
    const hadNativeHandler = nativeEventType ? hasNativeEventHandler(node, nativeEventType) : false
    const hadNativeClickHandler = hasNativeEventHandler(node, "click")
    const handler = isHostEventHandler(value) ? value : undefined
'''
    event_snapshot_replacement = '''    const nativeEventType = nativeEventTypeForDomEvent(eventType)
    const hadNativeHandler = nativeEventType ? hasNativeEventHandler(node, nativeEventType) : false
    const hadNativeClickHandler = hasNativeEventHandler(node, "click")
    const hadRangeNativeHandlers = new Map(
      (["mouseDown", "mouseMove", "mouseUp"] as const).map((nativeType) => [nativeType, hasNativeEventHandler(node, nativeType)]),
    )
    const handler = isHostEventHandler(value) ? value : undefined
'''
    if "const hadRangeNativeHandlers" not in text:
        if event_snapshot_anchor not in text:
            raise SystemExit(f"range event snapshot anchor missing in {relative}")
        text = text.replace(event_snapshot_anchor, event_snapshot_replacement, 1)

    event_listener_anchor = '''    if (nativeEventType !== "click") {
      const hasNativeClickHandler = hasNativeEventHandler(node, "click")
      if (hadNativeClickHandler !== hasNativeClickHandler) {
        node.root.driver.enqueue("setEventListener", node.id, "click", hasNativeClickHandler)
      }
    }

    const nextPointerEvents = effectivePointerEvents(node)
'''
    event_listener_replacement = '''    if (nativeEventType !== "click") {
      const hasNativeClickHandler = hasNativeEventHandler(node, "click")
      if (hadNativeClickHandler !== hasNativeClickHandler) {
        node.root.driver.enqueue("setEventListener", node.id, "click", hasNativeClickHandler)
      }
    }
    for (const rangeNativeType of ["mouseDown", "mouseMove", "mouseUp"] as const) {
      const hadRangeHandler = hadRangeNativeHandlers.get(rangeNativeType) ?? false
      const hasRangeHandler = hasNativeEventHandler(node, rangeNativeType)
      if (hadRangeHandler !== hasRangeHandler) {
        node.root.driver.enqueue("setEventListener", node.id, rangeNativeType, hasRangeHandler)
      }
    }

    const nextPointerEvents = effectivePointerEvents(node)
'''
    if "for (const rangeNativeType of [\"mouseDown\", \"mouseMove\", \"mouseUp\"] as const)" not in text:
        if event_listener_anchor not in text:
            raise SystemExit(f"range event listener anchor missing in {relative}")
        text = text.replace(event_listener_anchor, event_listener_replacement, 1)

    type_snapshot_anchor = '''  const previousPointerEvents = name === "role" ? effectivePointerEvents(node) : undefined
  const previousTypeClickHandler = name === "type" ? hasNativeEventHandler(node, "click") : false
  if (value === undefined) node.props.delete(name)
'''
    type_snapshot_replacement = '''  const previousPointerEvents = name === "role" ? effectivePointerEvents(node) : undefined
  const previousTypeClickHandler = name === "type" ? hasNativeEventHandler(node, "click") : false
  const previousTypeRangeHandlers = name === "type"
    ? new Map((["mouseDown", "mouseMove", "mouseUp"] as const).map((nativeType) => [nativeType, hasNativeEventHandler(node, nativeType)]))
    : undefined
  if (value === undefined) node.props.delete(name)
'''
    if "const previousTypeRangeHandlers" not in text:
        if type_snapshot_anchor not in text:
            raise SystemExit(f"range type snapshot anchor missing in {relative}")
        text = text.replace(type_snapshot_anchor, type_snapshot_replacement, 1)

    type_listener_anchor = '''  if (node.root && node.nativeAlive && name === "type") {
    const nextTypeClickHandler = hasNativeEventHandler(node, "click")
    if (previousTypeClickHandler !== nextTypeClickHandler) {
      node.root.driver.enqueue("setEventListener", node.id, "click", nextTypeClickHandler)
    }
  }
  if (!node.root || !node.nativeAlive || isReserved(name)) return
'''
    type_listener_replacement = '''  if (node.root && node.nativeAlive && name === "type") {
    const nextTypeClickHandler = hasNativeEventHandler(node, "click")
    if (previousTypeClickHandler !== nextTypeClickHandler) {
      node.root.driver.enqueue("setEventListener", node.id, "click", nextTypeClickHandler)
    }
    for (const rangeNativeType of ["mouseDown", "mouseMove", "mouseUp"] as const) {
      const previous = previousTypeRangeHandlers?.get(rangeNativeType) ?? false
      const next = hasNativeEventHandler(node, rangeNativeType)
      if (previous !== next) node.root.driver.enqueue("setEventListener", node.id, rangeNativeType, next)
    }
    node.root.driver.enqueue("setStyle", node.id, nativeStyleFor(node))
  }
  if (!node.root || !node.nativeAlive || isReserved(name)) return
'''
    if "previousTypeRangeHandlers?.get" not in text:
        if type_listener_anchor not in text:
            raise SystemExit(f"range mounted type listener anchor missing in {relative}")
        text = text.replace(type_listener_anchor, type_listener_replacement, 1)

    adopt_anchor = '''    if (hasCheckboxActivationHandler(node)) nativeEventTypes.add("click")
    for (const eventType of nativeEventTypes) {
'''
    adopt_replacement = '''    if (hasCheckboxActivationHandler(node)) nativeEventTypes.add("click")
    if (hasRangeChangeHandler(node)) {
      nativeEventTypes.add("mouseDown")
      nativeEventTypes.add("mouseMove")
      nativeEventTypes.add("mouseUp")
    }
    for (const eventType of nativeEventTypes) {
'''
    if "if (hasRangeChangeHandler(node))" not in text:
        if adopt_anchor not in text:
            raise SystemExit(f"range adoption listener anchor missing in {relative}")
        text = text.replace(adopt_anchor, adopt_replacement, 1)

    helper_anchor = '''function hasCheckboxActivationHandler(node: HostElementNode): boolean {
  return node.tagName === "INPUT" &&
    String(node.props.get("type") ?? "").toLowerCase() === "checkbox" &&
    (node.events.has("change") || node.events.has("input"))
}

function hasNativeEventHandler(node: HostElementNode, nativeEventType: string): boolean {
  if (nativeEventType === "click" && hasCheckboxActivationHandler(node)) return true
'''
    helper_replacement = '''function hasCheckboxActivationHandler(node: HostElementNode): boolean {
  return node.tagName === "INPUT" &&
    String(node.props.get("type") ?? "").toLowerCase() === "checkbox" &&
    (node.events.has("change") || node.events.has("input"))
}

function hasRangeChangeHandler(node: HostElementNode): boolean {
  return isRangeInput(node) && (node.events.has("change") || node.events.has("input"))
}

function hasNativeEventHandler(node: HostElementNode, nativeEventType: string): boolean {
  if (nativeEventType === "click" && hasCheckboxActivationHandler(node)) return true
  if ((nativeEventType === "mouseDown" || nativeEventType === "mouseMove" || nativeEventType === "mouseUp") && hasRangeChangeHandler(node)) return true
'''
    if "function hasRangeChangeHandler" not in text:
        if helper_anchor not in text:
            raise SystemExit(f"range native handler helper anchor missing in {relative}")
        text = text.replace(helper_anchor, helper_replacement, 1)

    path.write_text(text)

for relative in ["packages/solid1/src/host/events.ts", "packages/solid/src/host/events.ts"]:
    path = ROOT / relative
    text = path.read_text()

    fields_anchor = '''  readonly #pointerCapture = new Map<number, number>()
  readonly #lastPointerEvent = new Map<number, NativeEventPayload>()
  #lastClick: LastClick | undefined
'''
    fields_replacement = '''  readonly #pointerCapture = new Map<number, number>()
  readonly #lastPointerEvent = new Map<number, NativeEventPayload>()
  #activeRangeId: number | undefined
  #lastClick: LastClick | undefined
'''
    if "#activeRangeId" not in text:
        if fields_anchor not in text:
            raise SystemExit(f"range event state anchor missing in {relative}")
        text = text.replace(fields_anchor, fields_replacement, 1)

    deactivate_anchor = '''    this.#targets.delete(id)
    this.#nativePointerDown.delete(id)
  }
'''
    deactivate_replacement = '''    this.#targets.delete(id)
    this.#nativePointerDown.delete(id)
    if (this.#activeRangeId === id) this.#activeRangeId = undefined
  }
'''
    if "if (this.#activeRangeId === id)" not in text:
        if deactivate_anchor not in text:
            raise SystemExit(f"range deactivate anchor missing in {relative}")
        text = text.replace(deactivate_anchor, deactivate_replacement, 1)

    clear_anchor = '''    this.#pointerCapture.clear()
    this.#lastPointerEvent.clear()
    this.#lastClick = undefined
'''
    clear_replacement = '''    this.#pointerCapture.clear()
    this.#lastPointerEvent.clear()
    this.#activeRangeId = undefined
    this.#lastClick = undefined
'''
    if "this.#activeRangeId = undefined\n    this.#lastClick" not in text:
        if clear_anchor not in text:
            raise SystemExit(f"range clear anchor missing in {relative}")
        text = text.replace(clear_anchor, clear_replacement, 1)

    down_anchor = '''      case "mouseDown": {
        this.#activePointers.add(POINTER_ID)
        this.#lastPointerEvent.set(POINTER_ID, event)
'''
    down_replacement = '''      case "mouseDown": {
        this.#activePointers.add(POINTER_ID)
        this.#lastPointerEvent.set(POINTER_ID, event)
        if ((event.button ?? 0) === 0 && this.#isRangeTarget(event.elementId)) {
          this.#activeRangeId = event.elementId
          if (this.#updateRangeValue(event.elementId, event)) this.#dispatchDom(event.elementId, "input", event)
        }
'''
    if "this.#isRangeTarget(event.elementId)" not in text:
        if down_anchor not in text:
            raise SystemExit(f"range mouseDown anchor missing in {relative}")
        text = text.replace(down_anchor, down_replacement, 1)

    move_anchor = '''      case "mouseMove": {
        this.#lastPointerEvent.set(POINTER_ID, event)
        const capturedId = this.#pointerCapture.get(POINTER_ID)
'''
    move_replacement = '''      case "mouseMove": {
        this.#lastPointerEvent.set(POINTER_ID, event)
        const activeRangeId = this.#activeRangeId
        if (activeRangeId !== undefined && this.#updateRangeValue(activeRangeId, event)) {
          this.#dispatchDom(activeRangeId, "input", { ...event, elementId: activeRangeId })
        }
        const capturedId = this.#pointerCapture.get(POINTER_ID)
'''
    if "const activeRangeId = this.#activeRangeId" not in text:
        if move_anchor not in text:
            raise SystemExit(f"range mouseMove anchor missing in {relative}")
        text = text.replace(move_anchor, move_replacement, 1)

    up_anchor = '''      case "mouseUp": {
        this.#lastPointerEvent.set(POINTER_ID, event)
        const capturedId = this.#pointerCapture.get(POINTER_ID)
'''
    up_replacement = '''      case "mouseUp": {
        this.#lastPointerEvent.set(POINTER_ID, event)
        const activeRangeId = this.#activeRangeId
        if (activeRangeId !== undefined) {
          const rangeEvent = { ...event, elementId: activeRangeId }
          if (this.#updateRangeValue(activeRangeId, rangeEvent)) this.#dispatchDom(activeRangeId, "input", rangeEvent)
          this.#dispatchDom(activeRangeId, "change", rangeEvent)
          this.#activeRangeId = undefined
        }
        const capturedId = this.#pointerCapture.get(POINTER_ID)
'''
    if "const rangeEvent = { ...event, elementId: activeRangeId }" not in text:
        if up_anchor not in text:
            raise SystemExit(f"range mouseUp anchor missing in {relative}")
        text = text.replace(up_anchor, up_replacement, 1)

    method_anchor = '''  #dispatchDom(
    elementId: number,
'''
    methods = '''  #isRangeTarget(elementId: number): boolean {
    return this.#targets.get(elementId)?.getAttribute("type")?.toLowerCase() === "range"
  }

  #updateRangeValue(elementId: number, event: NativeEventPayload): boolean {
    const target = this.#targets.get(elementId)
    if (!target || target.getAttribute("type")?.toLowerCase() !== "range") return false
    const bounds = target.getBoundingClientRect()
    if (!(bounds.width > 0)) return false
    const min = finiteRangeNumber(target.getAttribute("min"), 0)
    const max = finiteRangeNumber(target.getAttribute("max"), 100)
    const low = Math.min(min, max)
    const high = Math.max(min, max)
    const ratio = Math.max(0, Math.min(1, ((event.x ?? bounds.left) - bounds.left) / bounds.width))
    const raw = low + (high - low) * ratio
    const stepAttribute = target.getAttribute("step")
    const step = stepAttribute?.toLowerCase() === "any" ? undefined : finiteRangeNumber(stepAttribute, 1)
    const quantized = step && step > 0 ? low + Math.round((raw - low) / step) * step : raw
    const next = String(normalizeRangeNumber(Math.max(low, Math.min(high, quantized)), stepAttribute))
    if (target.value === next) return false
    target.value = next
    return true
  }

  #dispatchDom(
    elementId: number,
'''
    if "#updateRangeValue(elementId" not in text:
        if method_anchor not in text:
            raise SystemExit(f"range helper method anchor missing in {relative}")
        text = text.replace(method_anchor, methods, 1)

    class_anchor = '''export class EventRegistry {
'''
    number_helpers = '''function finiteRangeNumber(value: string | null | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeRangeNumber(value: number, stepAttribute: string | null | undefined): number {
  if (!stepAttribute || stepAttribute.toLowerCase() === "any") return Number(value.toFixed(6))
  const decimal = stepAttribute.match(/\.(\d+)/)?.[1]?.length ?? 0
  return Number(value.toFixed(Math.min(12, decimal)))
}

export class EventRegistry {
'''
    if "function finiteRangeNumber" not in text:
        if class_anchor not in text:
            raise SystemExit(f"range number helper anchor missing in {relative}")
        text = text.replace(class_anchor, number_helpers, 1)

    path.write_text(text)

parity_path = ROOT / "packages/solid1/scripts/check-host-parity.ts"
parity = parity_path.read_text()
anchor = '''const doubleClickRegistry = new EventRegistry()
'''
test = '''const rangeRegistry = new EventRegistry()
const rangeTarget = createHostElement("input", "input")
setHostProperty(rangeTarget, "type", "range")
setHostProperty(rangeTarget, "min", "-60")
setHostProperty(rangeTarget, "max", "6")
setHostProperty(rangeTarget, "step", "0.1")
setHostProperty(rangeTarget, "value", "-60")
Object.defineProperty(rangeTarget, "getBoundingClientRect", {
  configurable: true,
  value: () => ({ left: 0, top: 0, right: 100, bottom: 16, width: 100, height: 16 }),
})
rangeRegistry.activate(5)
rangeRegistry.setTarget(5, rangeTarget)
let rangeChangeValue = ""
rangeRegistry.set(5, "change", (event) => { rangeChangeValue = event.currentTarget?.value ?? "" })
rangeRegistry.dispatch({ elementId: 5, eventType: "mouseDown", button: 0, x: 25, y: 8 } satisfies Parameters<EventRegistry["dispatch"]>[0])
rangeRegistry.dispatch({ elementId: 5, eventType: "mouseMove", button: 0, x: 75, y: 8 } satisfies Parameters<EventRegistry["dispatch"]>[0])
rangeRegistry.dispatch({ elementId: 5, eventType: "mouseUp", button: 0, x: 75, y: 8 } satisfies Parameters<EventRegistry["dispatch"]>[0])
if (rangeTarget.value !== "-10.5" || rangeChangeValue !== "-10.5") {
  throw new Error(`range drag must quantize value and commit change on pointer release: ${rangeTarget.value}/${rangeChangeValue}`)
}

const doubleClickRegistry = new EventRegistry()
'''
if "range drag must quantize value and commit change" not in parity:
    if anchor not in parity:
        raise SystemExit("host parity range test anchor missing")
    parity = parity.replace(anchor, test, 1)
parity_path.write_text(parity)

prop_path = ROOT / "packages/solid/test/prop-parity.test.ts"
prop = prop_path.read_text()
anchor = '''  it("forwards custom-element values and serializes unsupported values as null", () => {
'''
test = '''  it("preserves semantic range identity and native drag subscriptions", () => {
    const { renderer, driver, root } = fixture()
    const node = createHostElement("input", "input")

    setHostProperty(node, "type", "range", undefined)
    setHostProperty(node, "min", "-60", undefined)
    setHostProperty(node, "max", "6", undefined)
    setHostProperty(node, "step", "0.1", undefined)
    setHostProperty(node, "value", "-12", undefined)
    setHostProperty(node, "onChange", () => {}, undefined)
    insertHostNode(root, node)
    driver.flush()

    const firstBatch = renderer.batches[0] ?? []
    expect(firstBatch).toContainEqual(["createElement", 1, "div"])
    expect(firstBatch).toContainEqual(["setEventListener", 1, "change", true])
    expect(firstBatch).toContainEqual(["setEventListener", 1, "mouseDown", true])
    expect(firstBatch).toContainEqual(["setEventListener", 1, "mouseMove", true])
    expect(firstBatch).toContainEqual(["setEventListener", 1, "mouseUp", true])
    expect(firstBatch).toContainEqual(["setCustomProp", 1, "type", "range"])
    expect(firstBatch).toContainEqual(["setCustomProp", 1, "min", "-60"])
    expect(firstBatch).toContainEqual(["setCustomProp", 1, "max", "6"])
    expect(firstBatch).toContainEqual(["setCustomProp", 1, "step", "0.1"])
    expect(firstBatch).toContainEqual(["setCustomProp", 1, "value", "-12"])
  })

  it("forwards custom-element values and serializes unsupported values as null", () => {
'''
if "preserves semantic range identity and native drag subscriptions" not in prop:
    if anchor not in prop:
        raise SystemExit("range prop parity insertion anchor missing")
    prop = prop.replace(anchor, test, 1)
prop_path.write_text(prop)

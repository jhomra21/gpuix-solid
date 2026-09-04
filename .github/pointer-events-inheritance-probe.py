from pathlib import Path

FILES = [
    Path("packages/solid1/src/host/nodes.ts"),
    Path("packages/solid/src/host/nodes.ts"),
]

for path in FILES:
    text = path.read_text()

    old = '''const customStyleProperties = new WeakMap<HostElementNode, Map<string, string>>()'''
    new = '''const customStyleProperties = new WeakMap<HostElementNode, Map<string, string>>()
const appliedPointerEvents = new WeakMap<HostElementNode, StyleDesc["pointerEvents"] | undefined>()
const INTERACTIVE_TAG_NAMES = new Set(["a", "button", "input", "label", "select", "summary", "textarea"])
const INTERACTIVE_ROLES = new Set([
  "button",
  "checkbox",
  "combobox",
  "link",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "radio",
  "slider",
  "spinbutton",
  "switch",
  "tab",
  "textbox",
])'''
    if old not in text:
        raise SystemExit(f"custom style map marker not found in {path}")
    text = text.replace(old, new, 1)

    old = '''  if (name === "style") {
    node.style = createHostStyleDeclaration(node, isStyle(value) ? value : {})
    if (node.root && node.nativeAlive) node.root.driver.enqueue("setStyle", node.id, node.style)
    return
  }'''
    new = '''  if (name === "style") {
    const previousPointerEvents = effectivePointerEvents(node)
    node.style = createHostStyleDeclaration(node, isStyle(value) ? value : {})
    if (node.root && node.nativeAlive) {
      const nextPointerEvents = effectivePointerEvents(node)
      node.root.driver.enqueue("setStyle", node.id, nativeStyleFor(node, nextPointerEvents))
      appliedPointerEvents.set(node, nextPointerEvents)
      if (previousPointerEvents !== nextPointerEvents) {
        for (const child of node.children) refreshInheritedPointerEvents(child)
      }
    }
    return
  }'''
    if old not in text:
        raise SystemExit(f"style update block not found in {path}")
    text = text.replace(old, new, 1)

    old = '''  const eventType = EVENT_PROP_TO_TYPE.get(name)
  if (eventType) {
    const nativeEventType = nativeEventTypeForDomEvent(eventType)
    const hadNativeHandler = nativeEventType ? hasNativeEventHandler(node, nativeEventType) : false
    const handler = isHostEventHandler(value) ? value : undefined
    if (handler) node.events.set(eventType, handler)
    else node.events.delete(eventType)

    if (!node.root || !node.nativeAlive) return
    if (handler) node.root.events.set(node.id, eventType, handler)
    else node.root.events.delete(node.id, eventType)

    if (nativeEventType) {
      const hasNativeHandler = hasNativeEventHandler(node, nativeEventType)
      if (hadNativeHandler != hasNativeHandler) {
        node.root.driver.enqueue("setEventListener", node.id, nativeEventType, hasNativeHandler)
      }
    }
    return
  }'''
    new = '''  const eventType = EVENT_PROP_TO_TYPE.get(name)
  if (eventType) {
    const previousPointerEvents = effectivePointerEvents(node)
    const nativeEventType = nativeEventTypeForDomEvent(eventType)
    const hadNativeHandler = nativeEventType ? hasNativeEventHandler(node, nativeEventType) : false
    const handler = isHostEventHandler(value) ? value : undefined
    if (handler) node.events.set(eventType, handler)
    else node.events.delete(eventType)

    if (!node.root || !node.nativeAlive) return
    if (handler) node.root.events.set(node.id, eventType, handler)
    else node.root.events.delete(node.id, eventType)

    if (nativeEventType) {
      const hasNativeHandler = hasNativeEventHandler(node, nativeEventType)
      if (hadNativeHandler != hasNativeHandler) {
        node.root.driver.enqueue("setEventListener", node.id, nativeEventType, hasNativeHandler)
      }
    }

    const nextPointerEvents = effectivePointerEvents(node)
    if (previousPointerEvents !== nextPointerEvents) {
      node.root.driver.enqueue("setStyle", node.id, nativeStyleFor(node, nextPointerEvents))
      appliedPointerEvents.set(node, nextPointerEvents)
    }
    return
  }'''
    if old not in text:
        raise SystemExit(f"event update block not found in {path}")
    text = text.replace(old, new, 1)

    old = '''  if (value === undefined) node.props.delete(name)
  else node.props.set(name, customPropValue(value))
  if (!node.root || !node.nativeAlive || isReserved(name)) return'''
    new = '''  const previousPointerEvents = name === "role" ? effectivePointerEvents(node) : undefined
  if (value === undefined) node.props.delete(name)
  else node.props.set(name, customPropValue(value))
  if (node.root && node.nativeAlive && name === "role") {
    const nextPointerEvents = effectivePointerEvents(node)
    if (previousPointerEvents !== nextPointerEvents) {
      node.root.driver.enqueue("setStyle", node.id, nativeStyleFor(node, nextPointerEvents))
      appliedPointerEvents.set(node, nextPointerEvents)
    }
  }
  if (!node.root || !node.nativeAlive || isReserved(name)) return'''
    if old not in text:
        raise SystemExit(f"prop update block not found in {path}")
    text = text.replace(old, new, 1)

    old = '''  const index = anchor ? parent.children.indexOf(anchor) : parent.children.length
  parent.children.splice(index, 0, node)
  node.parent = parent

  if (!root) return'''
    new = '''  const index = anchor ? parent.children.indexOf(anchor) : parent.children.length
  parent.children.splice(index, 0, node)
  node.parent = parent

  if (root) refreshInheritedPointerEvents(node)
  if (!root) return'''
    if old not in text:
        raise SystemExit(f"insert block not found in {path}")
    text = text.replace(old, new, 1)

    old = '''function createHostStyleDeclaration(node: HostElementNode, style: StyleDesc): HostStyleDeclaration {'''
    new = '''function inheritedPointerEvents(node: HostElementNode): StyleDesc["pointerEvents"] | undefined {
  let parent = node.parent
  while (parent?.kind === "element") {
    if (parent.style.pointerEvents !== undefined) return parent.style.pointerEvents
    parent = parent.parent
  }
  return undefined
}

function ownsSemanticHitSurface(node: HostElementNode): boolean {
  if (INTERACTIVE_TAG_NAMES.has(node.localName)) return true
  const role = node.props.get("role")
  return role !== undefined && role !== null && INTERACTIVE_ROLES.has(String(role))
}

function effectivePointerEvents(node: HostElementNode): StyleDesc["pointerEvents"] | undefined {
  // Preserve explicit source ownership first. In particular, a descendant
  // pointer-events:auto must be able to re-enable itself beneath an inherited none.
  if (node.style.pointerEvents !== undefined) return node.style.pointerEvents

  // Browser pointer-events:none applies through the subtree until a descendant
  // explicitly re-enables itself. Materialize only that inherited none; inherited
  // auto is intentionally left implicit so decorative descendants do not become
  // separate GPUIX hit targets.
  if (inheritedPointerEvents(node) === "none") return "none"

  // GPUIX 0.7 needs an explicit hit surface for transparent semantic controls.
  // Plain event-bearing divs keep their existing paint/hit behavior so parent
  // containers do not become new occluding surfaces.
  if (node.events.size > 0 && ownsSemanticHitSurface(node)) return "auto"
  return undefined
}

function nativeStyleFor(
  node: HostElementNode,
  pointerEvents = effectivePointerEvents(node),
): StyleDesc {
  if (node.style.pointerEvents !== undefined || pointerEvents === undefined) return node.style
  return { ...node.style, pointerEvents }
}

function refreshInheritedPointerEvents(node: HostNode): void {
  if (node.kind === "text") return
  const nextPointerEvents = effectivePointerEvents(node)
  const previousPointerEvents = appliedPointerEvents.get(node)
  if (node.root && node.nativeAlive && previousPointerEvents !== nextPointerEvents) {
    // A transition back to undefined intentionally sends the base style once so
    // a previously materialized auto/none value is cleared natively.
    node.root.driver.enqueue("setStyle", node.id, nativeStyleFor(node, nextPointerEvents))
    appliedPointerEvents.set(node, nextPointerEvents)
  }
  for (const child of node.children) refreshInheritedPointerEvents(child)
}

function createHostStyleDeclaration(node: HostElementNode, style: StyleDesc): HostStyleDeclaration {'''
    if old not in text:
        raise SystemExit(f"style declaration marker not found in {path}")
    text = text.replace(old, new, 1)

    old = '''    if (Object.keys(node.style).length > 0) {
      root.driver.enqueue("setStyle", node.id, node.style)
    }'''
    new = '''    const pointerEvents = effectivePointerEvents(node)
    const nativeStyle = nativeStyleFor(node, pointerEvents)
    if (Object.keys(nativeStyle).length > 0) {
      root.driver.enqueue("setStyle", node.id, nativeStyle)
    }
    appliedPointerEvents.set(node, pointerEvents)'''
    if old not in text:
        raise SystemExit(f"adopt style block not found in {path}")
    text = text.replace(old, new, 1)

    path.write_text(text)

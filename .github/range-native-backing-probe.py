from pathlib import Path

for package in ["packages/solid1", "packages/solid"]:
    path = Path(package) / "src/host/nodes.ts"
    source = path.read_text()

    field_anchor = '''  readonly kind = "element" as const
  readonly type: ElementType
  readonly tagName: string
'''
    field_replacement = '''  readonly kind = "element" as const
  readonly type: ElementType
  nativeType: ElementType
  readonly tagName: string
'''
    if field_anchor not in source:
        raise SystemExit(f"HostElementNode field anchor missing in {path}")
    source = source.replace(field_anchor, field_replacement, 1)

    ctor_anchor = '''  constructor(type: ElementType, tagName: string = type) {
    this.type = type
    this.localName = tagName
'''
    ctor_replacement = '''  constructor(type: ElementType, tagName: string = type) {
    this.type = type
    this.nativeType = type
    this.localName = tagName
'''
    if ctor_anchor not in source:
        raise SystemExit(f"HostElementNode constructor anchor missing in {path}")
    source = source.replace(ctor_anchor, ctor_replacement, 1)

    prop_anchor = '''  if (value === undefined) node.props.delete(name)
  else node.props.set(name, customPropValue(value))
  if (!node.root || !node.nativeAlive || isReserved(name)) return
  if (BUILT_IN_TYPES.has(node.type) && !isForwardedBuiltInProp(name)) return
'''
    prop_replacement = '''  if (value === undefined) node.props.delete(name)
  else node.props.set(name, customPropValue(value))

  if (name === "type" && node.tagName === "INPUT" && !node.nativeAlive) {
    node.nativeType = String(value).toLowerCase() === "range" ? "div" : "input"
  }

  if (!node.root || !node.nativeAlive || isReserved(name)) return
  if (BUILT_IN_TYPES.has(node.nativeType) && !isForwardedBuiltInProp(name)) return
'''
    if prop_anchor not in source:
        raise SystemExit(f"setHostProperty forwarding anchor missing in {path}")
    source = source.replace(prop_anchor, prop_replacement, 1)

    adopt_create_anchor = '''  root.events.activate(node.id)
  root.driver.enqueue("createElement", node.id, node.type)
'''
    adopt_create_replacement = '''  root.events.activate(node.id)
  root.driver.enqueue("createElement", node.id, node.kind === "element" ? node.nativeType : node.type)
'''
    if adopt_create_anchor not in source:
        raise SystemExit(f"adopt createElement anchor missing in {path}")
    source = source.replace(adopt_create_anchor, adopt_create_replacement, 1)

    adopt_props_anchor = '''      if (isReserved(name)) continue
      if (BUILT_IN_TYPES.has(node.type) && !isForwardedBuiltInProp(name)) continue
      root.driver.enqueue("setCustomProp", node.id, name, customPropValue(value))
'''
    adopt_props_replacement = '''      if (isReserved(name)) continue
      if (BUILT_IN_TYPES.has(node.nativeType) && !isForwardedBuiltInProp(name)) continue
      root.driver.enqueue("setCustomProp", node.id, name, customPropValue(value))
'''
    if adopt_props_anchor not in source:
        raise SystemExit(f"adopt props anchor missing in {path}")
    source = source.replace(adopt_props_anchor, adopt_props_replacement, 1)

    path.write_text(source)

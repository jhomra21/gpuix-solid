from pathlib import Path

path = Path(__file__).with_name("mount-exact-sample-detail-range-fix.py")
text = path.read_text()

old_anchor = '''    forward_anchor = \'\'\'function isForwardedBuiltInProp(node: HostElementNode, name: string): boolean {\n  return UNIVERSAL_PROPS.has(name) || name === "hidden" || name === "role" ||\n    (node.localName === "select" && name === "value") || name.startsWith("aria-")\n}\n\'\'\'\n'''
new_anchor = '''    forward_anchor = \'\'\'function isForwardedBuiltInProp(node: HostElementNode, name: string): boolean {\n  return UNIVERSAL_PROPS.has(name) ||\n    name === "hidden" ||\n    name === "role" ||\n    name.startsWith("aria-") ||\n    (node.localName === "select" && name === "value")\n}\n\'\'\'\n'''
if old_anchor not in text:
    raise SystemExit("range forwarding patcher anchor missing")
text = text.replace(old_anchor, new_anchor, 1)

old_replacement = '''function isForwardedBuiltInProp(node: HostElementNode, name: string): boolean {\n  return UNIVERSAL_PROPS.has(name) || name === "hidden" || name === "role" ||\n    (node.localName === "select" && name === "value") ||\n    (isRangeInput(node) && RANGE_INPUT_PROPS.has(name)) || name.startsWith("aria-")\n}\n'''
new_replacement = '''function isForwardedBuiltInProp(node: HostElementNode, name: string): boolean {\n  return UNIVERSAL_PROPS.has(name) ||\n    name === "hidden" ||\n    name === "role" ||\n    name.startsWith("aria-") ||\n    (node.localName === "select" && name === "value") ||\n    (isRangeInput(node) && RANGE_INPUT_PROPS.has(name))\n}\n'''
if old_replacement not in text:
    raise SystemExit("range forwarding replacement anchor missing")
text = text.replace(old_replacement, new_replacement, 1)

old_decimal = '  const decimal = stepAttribute.match(/\\.(\\d+)/)?.[1]?.length ?? 0\n'
new_decimal = '  const decimal = stepAttribute.includes(".") ? stepAttribute.split(".")[1]?.length ?? 0 : 0\n'
if old_decimal not in text:
    raise SystemExit("range decimal helper anchor missing")
text = text.replace(old_decimal, new_decimal, 1)

path.write_text(text)

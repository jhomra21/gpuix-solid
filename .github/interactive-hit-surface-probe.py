from pathlib import Path

path = Path("packages/solid1/src/universal.ts")
source = path.read_text()

set_property_anchor = '''    setHostProperty(node, name, value, previous)
    if (node.kind === "element" && (name.startsWith("data-") || name.startsWith("aria-"))) {
      reapplyNativeStyleSubtree(node)
    }
'''
set_property_replacement = '''    setHostProperty(node, name, value, previous)
    if (
      node.kind === "element" &&
      (name.startsWith("data-") || name.startsWith("aria-") || name.startsWith("on"))
    ) {
      reapplyNativeStyleSubtree(node)
    }
'''
if set_property_anchor not in source:
    raise SystemExit("setProperty reapply anchor missing")
source = source.replace(set_property_anchor, set_property_replacement, 1)

# Native hit ownership is resolved in host/nodes.ts where parent pointer-events
# state and the node's actual event registry are both available. Do not inject
# pointerEvents:auto into the source style here: doing so would erase the
# distinction between explicit source auto and a compatibility-owned hit surface.

path.write_text(source)

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "packages/solid1/src/dom-environment.ts"
text = path.read_text()

old_type = '''type CompatDataset = {
  liveAnnouncer: string | undefined
  reactAriaTopLayer: string | undefined
}
'''
new_type = '''type CompatDataset = Record<string, string | undefined>
'''
if old_type not in text:
    raise SystemExit("CompatDataset anchor missing")
text = text.replace(old_type, new_type, 1)

old_helpers = '''function datasetFromHost(node: HostElementNode) {
  return {
    liveAnnouncer: hostAttribute(node, "data-live-announcer") ?? undefined,
    reactAriaTopLayer: hostAttribute(node, "data-react-aria-top-layer") ?? undefined,
  } satisfies CompatDataset
}

function datasetFromAttributes(attributes: ReadonlyMap<string, string>) {
  return {
    liveAnnouncer: attributes.get("data-live-announcer"),
    reactAriaTopLayer: attributes.get("data-react-aria-top-layer"),
  } satisfies CompatDataset
}
'''
new_helpers = '''function dataAttributeProperty(name: string): string {
  return name
    .slice(5)
    .split("-")
    .map((part, index) => index === 0 ? part : `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("")
}

function datasetFromHost(node: HostElementNode): CompatDataset {
  const dataset: CompatDataset = {}
  for (const [name, value] of node.props) {
    if (!name.startsWith("data-") || value === null) continue
    dataset[dataAttributeProperty(name)] = String(value)
  }
  return dataset
}

function datasetFromAttributes(attributes: ReadonlyMap<string, string>): CompatDataset {
  const dataset: CompatDataset = {}
  for (const [name, value] of attributes) {
    if (!name.startsWith("data-")) continue
    dataset[dataAttributeProperty(name)] = value
  }
  return dataset
}
'''
if old_helpers not in text:
    raise SystemExit("dataset helper anchor missing")
text = text.replace(old_helpers, new_helpers, 1)
path.write_text(text)

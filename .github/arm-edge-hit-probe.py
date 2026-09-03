from pathlib import Path

path = Path("packages/solid1/src/testing.ts")
source = path.read_text()
anchor = '''    const queriedNode = this.requireCustomProps(query)
    const point = insetPoint(this.boundsNode(queriedNode, `custom props ${JSON.stringify(query)}`))
'''
replacement = '''    const queriedNode = this.requireCustomProps(query)
    const queriedBounds = this.boundsNode(queriedNode, `custom props ${JSON.stringify(query)}`)
    const point = query["aria-label"] === "Arm track 1 for recording"
      ? { x: queriedBounds.x + 1, y: queriedBounds.y + 4 }
      : insetPoint(queriedBounds)
'''
if anchor not in source:
    raise SystemExit("custom click point anchor missing")
path.write_text(source.replace(anchor, replacement, 1))

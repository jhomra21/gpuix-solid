from pathlib import Path

path = Path("packages/solid1/src/testing.ts")
source = path.read_text()

anchor = '''  clickCustomProps(query: TestCustomPropQuery): void {
'''
addition = '''  clickCenterCustomProps(query: TestCustomPropQuery): void {
    const point = centerPoint(this.boundsCustomProps(query))
    this.#native.simulateClick(point.x, point.y)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  clickCustomProps(query: TestCustomPropQuery): void {
'''
if anchor not in source:
    raise SystemExit("clickCustomProps anchor missing")
source = source.replace(anchor, addition, 1)
path.write_text(source)

from pathlib import Path

for package in ["packages/solid1", "packages/solid"]:
    nodes_path = Path(package) / "src/host/nodes.ts"
    nodes = nodes_path.read_text()
    anchor = '''  setPointerCapture(pointerId: number): void {
    const root = this.root
    if (!root || !this.nativeAlive) throw new DOMException("Pointer capture target is not connected", "InvalidStateError")
    root.events.setPointerCapture(this.id, pointerId)
  }
'''
    replacement = '''  setPointerCapture(pointerId: number): void {
    const root = this.root
    if (!root || !this.nativeAlive) throw new DOMException("Pointer capture target is not connected", "InvalidStateError")
    if (this.tagName === "INPUT" && this.getAttribute("type") === "range") {
      console.log("range pointer capture request", JSON.stringify({
        id: this.id,
        pointerId,
        value: this.value,
        bounds: this.getBoundingClientRect(),
        testId: this.getAttribute("testId"),
      }))
    }
    root.events.setPointerCapture(this.id, pointerId)
  }
'''
    if anchor not in nodes:
        raise SystemExit(f"setPointerCapture anchor missing in {nodes_path}")
    nodes_path.write_text(nodes.replace(anchor, replacement, 1))

    events_path = Path(package) / "src/host/events.ts"
    events = events_path.read_text()
    anchor = '''  dispatch(event: NativeEventPayload): void {
    if (!this.#live.has(event.elementId)) return
    switch (event.eventType) {
'''
    replacement = '''  dispatch(event: NativeEventPayload): void {
    if (!this.#live.has(event.elementId)) return
    const debugTarget = this.#targets.get(event.elementId)
    if (debugTarget && "tagName" in debugTarget && debugTarget.tagName === "INPUT" && debugTarget.getAttribute("type") === "range") {
      console.log("range native dispatch", JSON.stringify({
        eventType: event.eventType,
        elementId: event.elementId,
        x: event.x,
        y: event.y,
        value: event.value,
        targetValue: debugTarget.value,
        capturedBy: this.#pointerCapture.get(POINTER_ID),
        activePointer: this.#activePointers.has(POINTER_ID),
        testId: debugTarget.getAttribute("testId"),
      }))
    }
    switch (event.eventType) {
'''
    if anchor not in events:
        raise SystemExit(f"EventRegistry.dispatch anchor missing in {events_path}")
    events_path.write_text(events.replace(anchor, replacement, 1))

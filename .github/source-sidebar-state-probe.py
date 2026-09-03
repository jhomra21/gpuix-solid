from pathlib import Path


timeline_path = Path("examples/solid1-daw/src/native/Timeline.tsx")
timeline = timeline_path.read_text()
old_mute = '          onToggleMute: (id) => updateTrack(id, (track) => ({ ...track, muted: !track.muted })),\n'
new_mute = '''          onToggleMute: (id) => {
            updateTrack(id, (track) => ({ ...track, muted: !track.muted }))
            console.log("source sidebar native mute state", JSON.stringify({
              id,
              muted: tracks().find((track) => track.id === id)?.muted,
            }))
          },
'''
if old_mute not in timeline:
    raise SystemExit("native mute callback probe anchor missing")
timeline_path.write_text(timeline.replace(old_mute, new_mute, 1))

sidebar_path = Path("examples/solid1-daw/src/native/SourceTrackSidebar.tsx")
sidebar = sidebar_path.read_text()
old_sync = '''  createEffect(() => {
    setSourceTrackStore("tracks", reconcile(sourceTracks(props.tracks), { key: "id" }))
  })
'''
new_sync = '''  createEffect(() => {
    setSourceTrackStore("tracks", reconcile(sourceTracks(props.tracks), { key: "id" }))
    console.log("source sidebar adapted mute state", JSON.stringify({
      nativeMuted: props.tracks[0]?.muted,
      adaptedMuted: sourceTrackStore.tracks[0]?.muted,
    }))
  })
'''
if old_sync not in sidebar:
    raise SystemExit("source track store probe anchor missing")
sidebar_path.write_text(sidebar.replace(old_sync, new_sync, 1))

for events_path in [Path("packages/solid1/src/host/events.ts"), Path("packages/solid/src/host/events.ts")]:
    events = events_path.read_text()
    old_click = '''      case "click": {
        if (!this.#nativePointerDown.has(event.elementId)) {
'''
    new_click = '''      case "click": {
        const clickTarget = this.#targets.get(event.elementId)
        const clickPath: Array<Record<string, unknown>> = []
        let clickNode: DomCompatTarget | undefined = clickTarget
        while (clickNode) {
          clickPath.push({
            id: "id" in clickNode ? clickNode.id : undefined,
            tagName: "tagName" in clickNode ? clickNode.tagName : undefined,
            testId: "getAttribute" in clickNode && typeof clickNode.getAttribute === "function" ? clickNode.getAttribute("testId") : undefined,
            ariaLabel: "getAttribute" in clickNode && typeof clickNode.getAttribute === "function" ? clickNode.getAttribute("aria-label") : undefined,
            title: "getAttribute" in clickNode && typeof clickNode.getAttribute === "function" ? clickNode.getAttribute("title") : undefined,
            style: "style" in clickNode ? clickNode.style : undefined,
          })
          if (!("parentElement" in clickNode)) break
          const parent = clickNode.parentElement
          clickNode = parent && typeof parent === "object" ? parent as DomCompatTarget : undefined
        }
        console.log("source sidebar native click path", JSON.stringify({ elementId: event.elementId, x: event.x, y: event.y, path: clickPath }))
        if (!this.#nativePointerDown.has(event.elementId)) {
'''
    if old_click not in events:
        raise SystemExit(f"event click probe anchor missing in {events_path}")
    events_path.write_text(events.replace(old_click, new_click, 1))

test_path = Path("examples/solid1-daw/src/test.tsx")
test = test_path.read_text()
anchor = '''  const muteBackground = app.renderer.styleCustomProps(muteOn).backgroundColor
  app.renderer.clickCustomProps(muteOn)
'''
probe = '''  const muteBackground = app.renderer.styleCustomProps(muteOn).backgroundColor
  console.log("source sidebar mute bounds", JSON.stringify(app.renderer.boundsCustomProps(muteOn)))
  app.renderer.clickCustomProps(muteOn)
'''
if anchor not in test:
    raise SystemExit("mute bounds probe anchor missing")
test_path.write_text(test.replace(anchor, probe, 1))

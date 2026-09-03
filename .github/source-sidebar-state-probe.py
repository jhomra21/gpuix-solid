from pathlib import Path

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

test_path = Path("examples/solid1-daw/src/test.tsx")
test = test_path.read_text()
anchor = '''  const muteBackground = app.renderer.styleCustomProps(muteOn).backgroundColor
  app.renderer.clickCustomProps(muteOn)
'''
probe = '''  const muteBackground = app.renderer.styleCustomProps(muteOn).backgroundColor
  console.log("source sidebar mute geometry", JSON.stringify({
    button: app.renderer.boundsCustomProps(muteOn),
    ancestors: app.renderer.ancestorBoundsCustomProps(muteOn),
  }))
  app.renderer.clickCustomProps(muteOn)
'''
if anchor not in test:
    raise SystemExit("mute geometry probe anchor missing")
test_path.write_text(test.replace(anchor, probe, 1))

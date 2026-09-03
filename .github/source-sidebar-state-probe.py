from pathlib import Path

sidebar_path = Path("examples/solid1-daw/src/native/SourceTrackSidebar.tsx")
sidebar = sidebar_path.read_text()
old_sync = '''  createEffect(() => {
    setSourceTrackStore("tracks", reconcile(sourceTracks(props.tracks), { key: "id" }))
  })
'''
new_sync = '''  createEffect(() => {
    setSourceTrackStore("tracks", reconcile(sourceTracks(props.tracks), { key: "id" }))
    console.log("source sidebar adapted state", JSON.stringify({
      nativeMuted: props.tracks[0]?.muted,
      adaptedMuted: sourceTrackStore.tracks[0]?.muted,
      nativeArmedTrackId: props.tracks.find((track) => track.armed)?.id ?? null,
      adaptedKind: sourceTrackStore.tracks[0]?.kind,
      adaptedChannelRole: sourceTrackStore.tracks[0]?.channelRole,
    }))
  })
'''
if old_sync not in sidebar:
    raise SystemExit("source track store probe anchor missing")
sidebar_path.write_text(sidebar.replace(old_sync, new_sync, 1))

timeline_path = Path("examples/solid1-daw/src/native/Timeline.tsx")
timeline = timeline_path.read_text()
old_arm = '          onToggleArm: (id) => updateTrack(id, (track) => ({ ...track, armed: !track.armed })),\n'
new_arm = '''          onToggleArm: (id) => {
            updateTrack(id, (track) => ({ ...track, armed: !track.armed }))
            console.log("source sidebar arm callback", JSON.stringify({
              id,
              armed: tracks().find((track) => track.id === id)?.armed,
              armedTrackIds: tracks().filter((track) => track.armed).map((track) => track.id),
            }))
          },
'''
if old_arm not in timeline:
    raise SystemExit("arm callback probe anchor missing")
timeline_path.write_text(timeline.replace(old_arm, new_arm, 1))

test_path = Path("examples/solid1-daw/src/test.tsx")
test = test_path.read_text()
mute_anchor = '''  const muteBackground = app.renderer.styleCustomProps(muteOn).backgroundColor
  app.renderer.clickCustomProps(muteOn)
'''
mute_probe = '''  const muteBackground = app.renderer.styleCustomProps(muteOn).backgroundColor
  console.log("source sidebar mute geometry", JSON.stringify({
    button: app.renderer.boundsCustomProps(muteOn),
    ancestors: app.renderer.ancestorBoundsCustomProps(muteOn),
  }))
  app.renderer.clickCustomProps(muteOn)
'''
if mute_anchor not in test:
    raise SystemExit("mute geometry probe anchor missing")
test = test.replace(mute_anchor, mute_probe, 1)
arm_anchor = '''  app.renderer.clickCustomProps(armOff)
  requireCondition(app.renderer.hasCustomProps(armOn), "exact source record arm should expose Disarm after activation")
'''
arm_probe = '''  console.log("source sidebar arm geometry", JSON.stringify({
    button: app.renderer.boundsCustomProps(armOff),
    ancestors: app.renderer.ancestorBoundsCustomProps(armOff),
    disabled: app.renderer.customPropByCustomProps(armOff, "disabled"),
    ariaPressed: app.renderer.customPropByCustomProps(armOff, "aria-pressed"),
  }))
  app.renderer.clickCustomProps(armOff)
  requireCondition(app.renderer.hasCustomProps(armOn), "exact source record arm should expose Disarm after activation")
'''
if arm_anchor not in test:
    raise SystemExit("arm geometry probe anchor missing")
test_path.write_text(test.replace(arm_anchor, arm_probe, 1))

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

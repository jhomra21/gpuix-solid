from pathlib import Path
import re

MODEL = Path("examples/solid1-daw/src/native/model.ts")
WORKSPACE = Path("examples/solid1-daw/src/native/TimelineWorkspace.tsx")
TIMELINE = Path("examples/solid1-daw/src/native/Timeline.tsx")


def update_model() -> None:
    text = MODEL.read_text()
    if "  groupId?: string\n" not in text:
        anchor = "  collapsed?: boolean\n"
        if anchor not in text:
            raise SystemExit("model collapsed anchor missing")
        text = text.replace(anchor, anchor + "  groupId?: string\n", 1)
    MODEL.write_text(text)


def update_workspace() -> None:
    text = WORKSPACE.read_text()
    text = text.replace(
        'import TrackSidebar, { type TrackSidebarProps } from "./TrackSidebar"',
        'import SourceTrackSidebar, { type SourceTrackSidebarProps } from "./SourceTrackSidebar"',
    )
    text = text.replace(
        'sidebar: Omit<TrackSidebarProps, "tracks" | "selectedTrackId" | "bottomPanelOffsetPx">',
        'sidebar: Omit<SourceTrackSidebarProps, "tracks" | "selectedTrackId" | "bottomPanelOffsetPx" | "scrollElement">',
    )
    if "let scrollingTrackElement: HTMLDivElement | undefined" not in text:
        anchor = "const TimelineWorkspace = (props: TimelineWorkspaceProps): JSX.Element => {"
        if anchor not in text:
            raise SystemExit("workspace component anchor missing")
        text = text.replace(anchor, anchor + "\n  let scrollingTrackElement: HTMLDivElement | undefined", 1)
    if "scrollingTrackElement = element" not in text:
        marker = '            testId="timeline-scrolling-tracks"\n'
        if marker not in text:
            raise SystemExit("timeline scrolling tracks marker missing")
        text = text.replace(marker, marker + '            ref={(element) => { scrollingTrackElement = element }}\n', 1)
    pattern = re.compile(
        r'<TrackSidebar\s+tracks=\{props\.tracks\}\s+selectedTrackId=\{props\.selectedTrackId\}\s+bottomPanelOffsetPx=\{props\.bottomPanelOffsetPx\}\s+\{\.\.\.props\.sidebar\}\s*/>',
        re.MULTILINE,
    )
    replacement = """<SourceTrackSidebar
          tracks={props.tracks}
          selectedTrackId={props.selectedTrackId}
          bottomPanelOffsetPx={props.bottomPanelOffsetPx}
          scrollElement={() => scrollingTrackElement}
          {...props.sidebar}
        />"""
    text, count = pattern.subn(replacement, text, count=1)
    if count != 1 and "<SourceTrackSidebar" not in text:
        raise SystemExit("native sidebar render not found")
    WORKSPACE.write_text(text)


def update_timeline() -> None:
    text = TIMELINE.read_text()
    start = text.find("  const cycleOutputTarget = (id: string): void => {")
    end = text.find("  const hideAutomationLane = (id: string): void => {", start)
    if start < 0 or end < 0:
        raise SystemExit("routing helper block not found")
    routing = '''  const setOutputTarget = (id: string, targetId?: string): void => {
    const target = targetId ? tracks().find((track) => track.id === targetId) : undefined
    updateTrack(id, (track) => ({ ...track, outputTarget: target?.name ?? "Master" }))
  }

  const setSends = (id: string, sends: Array<{ targetId: string; amount: number }>): void => {
    const send = sends.find((entry) => entry.amount > 0.0001)
    const target = send ? tracks().find((track) => track.id === send.targetId && track.kind === "return") : undefined
    updateTrack(id, (track) => ({
      ...track,
      sendTarget: target?.name ?? "None",
      send: send?.amount ?? 0,
    }))
  }

'''
    text = text[:start] + routing + text[end:]
    next_start = text.find("function nextTarget(current: string, targets: string[]): string {")
    if next_start >= 0:
        next_end = text.find("\n}\n", next_start)
        if next_end < 0:
            raise SystemExit("nextTarget end missing")
        text = text[:next_start] + text[next_end + 3 :]
    old_props = '''          onToggleCollapsed: (id) => updateTrack(id, (track) => ({ ...track, collapsed: !track.collapsed })),
          onCycleOutputTarget: cycleOutputTarget,
          onCycleSendTarget: cycleSendTarget,'''
    if old_props not in text:
        raise SystemExit("old sidebar routing props missing")
    text = text.replace(
        old_props,
        '''          onSetCollapsed: (id, collapsed) => updateTrack(id, (track) => ({ ...track, collapsed })),
          onSetOutputTarget: setOutputTarget,
          onSetSends: setSends,''',
        1,
    )
    anchor = "          onMasterVolumeChange: setMasterVolume,\n"
    if "onSetTrackColor:" not in text:
        if anchor not in text:
            raise SystemExit("master volume prop anchor missing")
        extra = '''          onMasterVolumeChange: setMasterVolume,
          onSetTrackColor: (id, color) => updateTrack(id, (track) => ({ ...track, color })),
          onAssignTrackColorToClips: (id) => updateTrack(id, (track) => ({
            ...track,
            clips: track.color ? track.clips.map((clip) => ({ ...clip, color: track.color })) : track.clips,
          })),
          onResetClipColors: (id) => updateTrack(id, (track) => ({
            ...track,
            clips: track.clips.map((clip) => ({
              ...clip,
              color: clip.kind === "midi" ? dawTheme.clipMidi : dawTheme.clipAudio,
            })),
          })),
          onDeleteTrack: (id) => setTracks((current) => current.filter((track) => track.id !== id)),
'''
        text = text.replace(anchor, extra, 1)
    TIMELINE.write_text(text)


update_model()
update_workspace()
update_timeline()

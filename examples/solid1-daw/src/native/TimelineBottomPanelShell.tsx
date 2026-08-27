import type { JSX } from "solid-js"
import UpstreamTimelineBottomPanelShell from "../upstream/components/timeline/TimelineBottomPanelShell"
import {
  BOTTOM_PANEL_EDGE_PADDING_PX,
  BOTTOM_PANEL_FOOTER_HEIGHT_PX,
} from "../upstream/lib/bottom-panel-layout"

export interface TimelineBottomPanelShellProps {
  heightPx: number
  footer: JSX.Element
  children: JSX.Element
}

const TimelineBottomPanelShell = (props: TimelineBottomPanelShellProps): JSX.Element => {
  const controls = {
    get heightPx(): number {
      return props.heightPx
    },
    onHeightPreview(_heightPx: number): void {},
    onHeightCommit(_heightPx: number): void {},
  }

  const footprint = () => props.heightPx + BOTTOM_PANEL_FOOTER_HEIGHT_PX + BOTTOM_PANEL_EDGE_PADDING_PX

  return (
    <div
      testId="bottom-panel"
      style={{
        position: "absolute",
        right: 0,
        bottom: 0,
        left: 0,
        width: "100%",
        height: footprint(),
        minHeight: footprint(),
      }}
    >
      <UpstreamTimelineBottomPanelShell
        controls={controls}
        resizeLabel="Resize bottom panel"
        footer={props.footer}
      >
        {props.children}
      </UpstreamTimelineBottomPanelShell>
    </div>
  )
}

export default TimelineBottomPanelShell

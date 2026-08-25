import type { JSX } from "solid-js"
import { dawTheme } from "./theme"

export interface TimelineBottomPanelShellProps {
  heightPx: number
  footer: JSX.Element
  children: JSX.Element
}

const TimelineBottomPanelShell = (props: TimelineBottomPanelShellProps): JSX.Element => (
  <div testId="bottom-panel" style={{ backgroundColor: dawTheme.appSurface, borderWidth: 1, borderColor: dawTheme.border, paddingBottom: 4 }}>
    <div style={{ height: props.heightPx, minHeight: props.heightPx, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, backgroundColor: "#00000001", cursor: "ns-resize" }} />
      {props.children}
    </div>
    {props.footer}
  </div>
)

export default TimelineBottomPanelShell

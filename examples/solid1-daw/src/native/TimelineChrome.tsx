import type { JSX } from "solid-js"
import TransportControls, { type TransportControlsProps } from "./TransportControls"

export interface TimelineChromeProps {
  transport: TransportControlsProps
}

// The web component also owns hidden file inputs and fixed TimelinePanels.
// The native fixture keeps the same visible chrome ownership while the root
// mounts the bottom panel as a native sibling to preserve its fixed footprint.
const TimelineChrome = (props: TimelineChromeProps): JSX.Element => (
  <TransportControls {...props.transport} />
)

export default TimelineChrome

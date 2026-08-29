import { EVENT_PROP_TO_TYPE } from "./host/events.js"

/**
 * Browser-only event names used by upstream component libraries that GPUIX
 * exposes through equivalent enter/leave native events.
 */
export function installBrowserEventCompatibility(): void {
  EVENT_PROP_TO_TYPE.set("onMouseOver", "mouseEnter")
  EVENT_PROP_TO_TYPE.set("onMouseOut", "mouseLeave")
}

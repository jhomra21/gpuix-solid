import { syncAnchoredSurfaceCompatibility } from "./anchored-surface-compat.js"
import { syncBrowserSelectorCompatibility } from "./browser-selector-compat.js"
import type { MutationDriver } from "./host/mutations.js"
import type { HostRootNode } from "./host/nodes.js"
import { syncNativeSvgLayoutCompatibility } from "./svg-layout-compat.js"

/**
 * Browser compatibility work must finish before any native mutation batch is
 * applied. Host APIs such as focus() and getBoundingClientRect() can flush from
 * inside a Solid effect, before createRoot's normal final flush.
 */
export function installBrowserPreflushCompatibility(
  root: HostRootNode,
  driver: MutationDriver,
): void {
  const flush = driver.flush.bind(driver)
  Object.defineProperty(driver, "flush", {
    configurable: true,
    value: () => {
      syncBrowserSelectorCompatibility(root)
      syncAnchoredSurfaceCompatibility(root)
      syncNativeSvgLayoutCompatibility(root)
      flush()
    },
  })
}

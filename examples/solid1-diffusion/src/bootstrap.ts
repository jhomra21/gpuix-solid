import { installDiffusionDesktopHost } from "./desktop-host"

/**
 * Installs the browser services Diffusion evaluates at module load, then loads
 * the untouched upstream-backed editor after those services exist.
 */
export async function loadDiffusionNativeApp() {
  await import("fake-indexeddb/auto")
  installDiffusionDesktopHost()
  return import("./app")
}

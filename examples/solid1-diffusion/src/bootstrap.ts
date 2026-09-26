import { installDiffusionDesktopHost } from "./desktop-host"

/**
 * Installs the native browser/desktop services Diffusion reads during module
 * evaluation, then loads the untouched upstream-backed editor.
 */
export async function loadDiffusionNativeApp() {
  installDiffusionDesktopHost()
  return import("./app")
}

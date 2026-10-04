import { installNativeAudioCompatibility } from "./audio-compat"
import { installDiffusionDesktopHost } from "./desktop-host"

function installPlatform(): void {
  installDiffusionDesktopHost()
  installNativeAudioCompatibility()
}

export async function loadDiffusionNativeApp() {
  installPlatform()
  return import("./native-app")
}

export async function loadDiffusionAcceptanceFixture() {
  installPlatform()
  return import("./app")
}

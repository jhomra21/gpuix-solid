import { MemoryRouter, Route, createMemoryHistory, type MemoryHistory } from "@solidjs/router"
import { ColorModeProvider } from "@kobalte/core"
import type { JSX } from "solid-js"
import { configureNativeStyleManifest } from "@jhomra21/gpuix-solid1"
import { AppContextMenu } from "@/components/app-context-menu"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/context/auth"
import { ProjectPage } from "@/pages/project"
import { openProjectFolder } from "@/projects/host"
import type { ProjectInfo } from "@desktop/main-channels"
import { nativeTailwindManifest } from "./native-tailwind.generated"

declare const __GPUIX_DIFFUSION_DEFAULT_PROJECT__: string

configureNativeStyleManifest(nativeTailwindManifest)

export type NativeDiffusionSession = {
  project: ProjectInfo
  history: MemoryHistory
}

export async function prepareNativeDiffusionSession(): Promise<NativeDiffusionSession> {
  const dir = process.env.GPUIX_DIFFUSION_PROJECT?.trim() || __GPUIX_DIFFUSION_DEFAULT_PROJECT__
  const project = await openProjectFolder(dir)

  const history = createMemoryHistory()
  history.set({
    value: `/projects/${encodeURIComponent(project.id || project.name)}`,
    replace: true,
  })

  return { project, history }
}

function NativeRoot(props: { children: JSX.Element }): JSX.Element {
  return (
    <ColorModeProvider initialColorMode="dark">
      <AppContextMenu>
        <AuthProvider>{props.children}</AuthProvider>
      </AppContextMenu>
      <Toaster />
    </ColorModeProvider>
  )
}

/**
 * GPUIX entrypoint for the pinned Diffusion editor.
 *
 * The editor itself is upstream ProjectPage. That component resolves the
 * project, creates Diffusion's provider stack, compiles and mounts the source,
 * watches the folder, and renders the unmodified EditorPage. GPUIX owns only
 * the outer native window/platform boundary.
 */
export function NativeDiffusionApp(props: { session: NativeDiffusionSession }): JSX.Element {
  return (
    <MemoryRouter history={props.session.history} root={NativeRoot}>
      <Route path="/projects/*ref" component={ProjectPage} />
    </MemoryRouter>
  )
}

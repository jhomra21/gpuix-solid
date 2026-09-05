import { Show, createSignal } from "solid-js"
import type { PublicInstance } from "gpuix-solid"
import {
  adaptiveFullScreenHeight,
  BottomBar,
  Box,
  Button,
  Canvas,
  ColorSwatchIcon,
  EditorLeftSidebar,
  EditorReadOnlyBanner,
  ExportButton,
  ExportInNewTabButton,
  ExportSettingsButton,
  Footer,
  FrameHandler,
  FrameSkeleton,
  FrameToolbar,
  getActiveEditorStore,
  getEditorSyncAdapter,
  getExportCanvasStore,
  getFrameState,
  HStack,
  KeyboardShortcuts,
  ManagedFrame,
  PortalHost,
  PreviewFrame,
  ShareButton,
  Sidebar,
  SparklesIcon,
  SuspenseEditorItem,
  ThemeSwitcher,
  Toolbar,
  useModality,
  dispatchRandomTheme,
} from "./compat"
import { Suspense, onMount } from "./solid-compat"

export function App() {
  const [frameRef, setFrameRef] = createSignal<PublicInstance>()
  const [portalHostRef, setPortalHostRef] = createSignal<PublicInstance>()
  const modality = useModality()
  const frameStore = getFrameState()
  const exportCanvasStore = getExportCanvasStore()
  const { readOnly, clone } = getEditorSyncAdapter()
  const initCanvas: (ref: () => PublicInstance | undefined) => void = exportCanvasStore.initCanvas
  onMount(() => initCanvas(frameRef))

  return (
    <Box
      display="flex"
      flexDirection="column"
      class={adaptiveFullScreenHeight}
    >
      <Toolbar canvasRef={frameRef()} />
      <div style={{ display: "flex", flexGrow: 1, minHeight: 0 }}>
        <Show when={modality === "full" && !readOnly()}>
          <EditorLeftSidebar />
        </Show>

        <PortalHost ref={setPortalHostRef} />

        <Canvas>
          <SuspenseEditorItem
            fallback={
              <Box
                height="100%"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <FrameSkeleton />
              </Box>
            }
          >
            <Show when={readOnly()}>
              <EditorReadOnlyBanner onClone={clone} />
            </Show>

            <Show when={!readOnly() && modality === "full"}>
              <Box display="flex" paddingTop={3} paddingX={4}>
                <HStack spacing="2">
                  <KeyboardShortcuts />
                </HStack>
              </Box>
            </Show>

            <Show when={modality === "mobile"}>
              <Box display="flex" justifyContent="flex-end" paddingX={3} paddingTop={2}>
                <HStack spacing="2" justifyContent="flexEnd">
                  <ExportSettingsButton />
                  <ShareButton showLabel={false} />
                  <Button
                    size="xs"
                    theme="secondary"
                    leftIcon={<ColorSwatchIcon />}
                    onClick={() => dispatchRandomTheme()}
                  />
                  <Button
                    size="xs"
                    theme="secondary"
                    leftIcon={<SparklesIcon />}
                    onClick={() => getActiveEditorStore().format()}
                  />
                  <ExportInNewTabButton canvasRef={frameRef()} />
                  <ExportButton canvasRef={frameRef()} />
                </HStack>
              </Box>
            </Show>

            <FrameHandler onScaleChange={frameStore.setScale}>
              <Suspense fallback={<FrameSkeleton />}>
                <ManagedFrame />
              </Suspense>
            </FrameHandler>

            <PreviewFrame ref={setFrameRef} />

            <Show when={modality === "full"}>
              <FrameToolbar frameRef={frameRef()} />
            </Show>
            <Footer />
          </SuspenseEditorItem>
        </Canvas>
        <Show when={!readOnly()}>
          <Show
            when={modality === "full"}
            fallback={<BottomBar portalHostRef={portalHostRef()} />}
          >
            <Sidebar>
              <ThemeSwitcher orientation="vertical" />
            </Sidebar>
          </Show>
        </Show>
      </div>
    </Box>
  )
}

export const CodeImageNativeDemo = App
export default App

import { For, Show, createMemo, createSignal, type Element as SolidElement } from "solid-js"
import type { EventPayload } from "gpuix-solid"
import { ToolMenu } from "../../upstream/diffusion-editor/apps/web/src/components/sidebar-left/project-menu/tool-menu"
import { ViewMenu } from "../../upstream/diffusion-editor/apps/web/src/components/sidebar-left/project-menu/view-menu"
import { C, type DiffusionEditorState } from "./compat"
import { DropdownMenu } from "./source-adapters/dropdown-menu"

type AssetKind = "VIDEO" | "AUDIO" | "IMAGE" | "FONT"
interface AssetEntry { id: string; name: string; kind: AssetKind }
type ProjectMenuPage = "root" | "file" | "edit" | "view" | "tool" | "asset" | "export"

const initialAssets: AssetEntry[] = [
  { id: "video-1", name: "studio-intro.mp4", kind: "VIDEO" },
  { id: "audio-1", name: "voiceover.wav", kind: "AUDIO" },
  { id: "image-1", name: "cover.png", kind: "IMAGE" },
  { id: "font-1", name: "Inter Variable", kind: "FONT" },
]

const text = { color: C.foreground, fontSize: 11 }
const muted = { color: C.mutedForeground, fontSize: 11 }

function Button(props: { testId?: string; active?: boolean; children: SolidElement; onClick?: () => void }): SolidElement {
  return (
    <div role="menuitem" testId={props.testId} onClick={props.onClick} style={{ height: 28, minWidth: 28, paddingLeft: 7, paddingRight: 7, borderRadius: 6, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", cursor: props.onClick ? "pointer" : "default", backgroundColor: props.active ? C.secondary : "#00000000", hover: props.onClick ? { backgroundColor: C.secondaryHover } : undefined }}>
      {props.children}
    </div>
  )
}

function MenuRow(props: { label: string; shortcut?: string; arrow?: boolean; testId?: string; onClick: () => void }): SolidElement {
  return (
    <div testId={props.testId} onClick={props.onClick} style={{ height: 28, paddingLeft: 8, paddingRight: 8, display: "flex", flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 4, cursor: "pointer", hover: { backgroundColor: C.secondaryHover } }}>
      <text style={{ ...text, flexGrow: 1, pointerEvents: "none" }}>{props.label}</text>
      <Show when={props.shortcut}><text style={{ ...muted, fontSize: 9, pointerEvents: "none" }}>{props.shortcut}</text></Show>
      <Show when={props.arrow}><text style={{ ...muted, fontSize: 10, pointerEvents: "none" }}>›</text></Show>
    </div>
  )
}

function MenuDivider(): SolidElement {
  return <div style={{ height: 1, marginTop: 4, marginBottom: 4, backgroundColor: C.borderStrong }} />
}

function ProjectMenu(props: {
  state: DiffusionEditorState
  onImport: () => void
  onRemoveUnused: () => string
  onDownloadAssets: () => string
}): SolidElement {
  const [open, setOpen] = createSignal(false)
  const [page, setPage] = createSignal<ProjectMenuPage>("root")
  const [message, setMessage] = createSignal<string | null>(null)

  const close = () => { setOpen(false); setPage("root") }
  const localAction = (message: string) => { setMessage(message); close() }
  const back = () => setPage("root")

  return (
    <div style={{ position: "relative" }}>
      <Button testId="diffusion-project-menu" active={open()} onClick={() => { setOpen(!open()); setPage("root") }}>
        <text style={text}>◈⌄</text>
      </Button>
      <Show when={open()}>
        <div testId="diffusion-project-menu-content" style={{ position: "absolute", left: 0, top: 32, width: page() === "view" ? 216 : 196, padding: 5, borderWidth: 1, borderColor: C.borderStrong, borderRadius: 7, backgroundColor: C.background }}>
          <Show when={page() !== "root"}>
            <MenuRow label="‹ Back" testId="diffusion-project-menu-back" onClick={back} />
            <MenuDivider />
          </Show>

          <Show when={page() === "root"}>
            <MenuRow label="Go to dashboard" shortcut="⇧⌘D" testId="diffusion-project-dashboard" onClick={() => localAction("Dashboard navigation requested locally")} />
            <MenuDivider />
            <MenuRow label="File" arrow onClick={() => setPage("file")} />
            <MenuRow label="Edit" arrow onClick={() => setPage("edit")} />
            <MenuRow label="View" arrow onClick={() => setPage("view")} />
            <MenuRow label="Tool" arrow onClick={() => setPage("tool")} />
            <MenuDivider />
            <MenuRow label="AI credits" arrow onClick={() => localAction("AI credits are unavailable in the local fixture")} />
            <MenuRow label="Help" arrow onClick={() => localAction("Help navigation requested locally")} />
            <MenuRow label="Account" onClick={() => localAction("Account navigation requested locally")} />
          </Show>

          <Show when={page() === "file"}>
            <MenuRow label="New project" testId="diffusion-file-new-project" onClick={() => { props.state.setProjectName("Untitled Project"); localAction("New project created locally") }} />
            <MenuRow label="Duplicate project" onClick={() => { props.state.setProjectName(`${props.state.projectName()} copy`); localAction("Project duplicated locally") }} />
            <MenuDivider />
            <MenuRow label="Import from computer..." shortcut="⌘I" testId="diffusion-file-import" onClick={() => { props.onImport(); close() }} />
            <MenuRow label="Asset" arrow onClick={() => setPage("asset")} />
            <MenuDivider />
            <MenuRow label="Export" arrow onClick={() => setPage("export")} />
            <MenuDivider />
            <MenuRow label="Delete project" onClick={() => localAction("Delete project requested locally")} />
          </Show>

          <Show when={page() === "asset"}>
            <MenuRow label="Download all assets..." testId="diffusion-download-all-assets" onClick={() => localAction(props.onDownloadAssets())} />
            <MenuDivider />
            <MenuRow label="Remove unused media..." testId="diffusion-remove-unused-media" onClick={() => localAction(props.onRemoveUnused())} />
          </Show>

          <Show when={page() === "export"}>
            <MenuRow label="Export scene..." shortcut="⌘E" onClick={() => localAction("Scene export queued locally")} />
            <MenuRow label="Export specific scene" arrow onClick={() => localAction("Specific-scene export opened locally")} />
            <MenuDivider />
            <MenuRow label="Export current frame as image" shortcut="⇧⌘E" onClick={() => localAction("Current-frame export queued locally")} />
          </Show>

          <Show when={page() === "edit"}>
            <MenuRow label="Undo" shortcut="⌘Z" onClick={() => localAction("Undo requested locally")} />
            <MenuRow label="Redo" shortcut="⇧⌘Z" onClick={() => localAction("Redo requested locally")} />
            <MenuDivider />
            <MenuRow label="Copy" shortcut="⌘C" onClick={() => localAction("Copy requested locally")} />
            <MenuRow label="Paste" shortcut="⌘V" onClick={() => localAction("Paste requested locally")} />
            <MenuRow label="Duplicate" shortcut="⌘D" onClick={() => localAction("Duplicate requested locally")} />
            <MenuDivider />
            <MenuRow label="Delete" shortcut="⌫" onClick={() => localAction("Delete requested locally")} />
            <MenuDivider />
            <MenuRow label="Hide" shortcut="⇧⌘H" onClick={() => localAction("Hide requested locally")} />
            <MenuDivider />
            <MenuRow label="Select all" shortcut="⌘A" onClick={() => localAction("Select all requested locally")} />
            <MenuRow label="Select parent" shortcut="\\" onClick={() => localAction("Select parent requested locally")} />
            <MenuRow label="Select children" shortcut="↩︎" onClick={() => localAction("Select children requested locally")} />
            <MenuRow label="Deselect" shortcut="Esc" onClick={() => localAction("Deselect requested locally")} />
          </Show>

          <Show when={page() === "view"}>
            <DropdownMenu bare onItemSelect={close}>
              <ViewMenu />
            </DropdownMenu>
          </Show>

          <Show when={page() === "tool"}>
            <DropdownMenu bare onItemSelect={close}>
              <ToolMenu />
            </DropdownMenu>
          </Show>
        </div>
      </Show>
      <Show when={message()}>{(value) => <text testId="diffusion-project-menu-status" style={{ position: "absolute", left: 0, top: 34, width: 220, color: C.mutedForeground, fontSize: 9 }}>{value()}</text>}</Show>
    </div>
  )
}

function AddAssetsMenu(props: { onImport: () => void; onCreateFolder: () => void }): SolidElement {
  const [open, setOpen] = createSignal(false)
  return (
    <div style={{ position: "relative" }}>
      <Button testId="diffusion-import" active={open()} onClick={() => setOpen(!open())}><text style={muted}>＋</text></Button>
      <Show when={open()}>
        <div testId="diffusion-add-assets-menu" style={{ position: "absolute", right: 0, top: 32, width: 160, padding: 5, borderWidth: 1, borderColor: C.borderStrong, borderRadius: 7, backgroundColor: C.background }}>
          <MenuRow label="Import assets" shortcut="⌘I" testId="diffusion-import-assets" onClick={() => { props.onImport(); setOpen(false) }} />
          <MenuRow label="Create folder" shortcut="⇧⌘N" testId="diffusion-create-folder" onClick={() => { props.onCreateFolder(); setOpen(false) }} />
        </div>
      </Show>
    </div>
  )
}

export function SidebarLeft(props: { state: DiffusionEditorState }): SolidElement {
  const [assets, setAssets] = createSignal<AssetEntry[]>(initialAssets)
  const [folders, setFolders] = createSignal<string[]>([])
  const [query, setQuery] = createSignal("")
  const [projectNameDraft, setProjectNameDraft] = createSignal<string | null>(null)
  let importedSequence = 0
  let folderSequence = 0

  const filteredAssets = createMemo(() => {
    const value = query().trim().toLowerCase()
    return value ? assets().filter((asset) => asset.name.toLowerCase().includes(value)) : assets()
  })
  const filteredFolders = createMemo(() => {
    const value = query().trim().toLowerCase()
    return value ? folders().filter((folder) => folder.toLowerCase().includes(value)) : folders()
  })

  const importAsset = (): void => {
    importedSequence += 1
    const id = `imported-${importedSequence}`
    setAssets((current) => [...current, { id, name: `imported-${importedSequence}.mp4`, kind: "VIDEO" }])
    props.state.setSelectedAsset(id)
  }

  const createFolder = (): void => {
    folderSequence += 1
    setFolders((current) => [...current, folderSequence === 1 ? "New folder" : `New folder ${folderSequence}`])
  }

  const downloadAssets = (): string => `${assets().length} assets prepared for local download`

  const removeUnused = (): string => {
    const unused = assets().filter((asset) => asset.id === "image-1")
    if (unused.length === 0) return "No unused media found"
    setAssets((current) => current.filter((asset) => asset.id !== "image-1"))
    if (props.state.selectedAsset() === "image-1") props.state.setSelectedAsset(null)
    return `Removed ${unused.length} unused media item`
  }

  const commitProjectName = (): void => {
    const trimmed = projectNameDraft()?.trim() ?? ""
    if (trimmed) props.state.setProjectName(trimmed)
    setProjectNameDraft(null)
  }

  return (
    <div testId="diffusion-sidebar-left" style={{ position: "relative", width: 264, height: "100%", flexShrink: 0, display: "flex", flexDirection: "column", backgroundColor: C.sidebar }}>
      <div style={{ height: 40, flexShrink: 0, display: "flex", flexDirection: "row", alignItems: "center", paddingLeft: 6, paddingRight: 10, borderBottomWidth: 1, borderColor: C.borderStrong }}>
        <div style={{ flexGrow: 1 }} />
        <Button testId="diffusion-toggle-timeline" active={!props.state.timelineMinimized()} onClick={() => props.state.setTimelineMinimized(!props.state.timelineMinimized())}><text style={muted}>▤</text></Button>
        <Button testId="diffusion-toggle-ui" onClick={() => props.state.setUiVisible(false)}><text style={muted}>▥</text></Button>
      </div>

      <div style={{ height: 48, flexShrink: 0, display: "flex", flexDirection: "row", alignItems: "center", gap: 7, paddingLeft: 10, paddingRight: 16 }}>
        <div style={{ width: 28, height: 28, flexShrink: 0 }} />
        <input
          testId="diffusion-project-name"
          value={projectNameDraft() ?? props.state.projectName()}
          placeholder="Project name"
          onChange={(event: EventPayload) => setProjectNameDraft(event.value ?? "")}
          onKeyDown={(event: EventPayload) => {
            if (event.key === "enter") commitProjectName()
            if (event.key === "escape") setProjectNameDraft(null)
          }}
          style={{ flexGrow: 1, height: 24, borderWidth: 0, backgroundColor: "#00000000", color: C.mutedForeground, fontSize: 11, paddingLeft: 5, paddingRight: 5 }}
        />
      </div>

      <div style={{ height: 1, width: "100%", backgroundColor: C.borderStrong }} />
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, minHeight: 0 }}>
        <div style={{ height: 48, display: "flex", flexDirection: "row", alignItems: "center", paddingLeft: 16, paddingRight: 16, gap: 6, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.borderStrong }}>
          <text style={{ color: C.foreground, fontSize: 12, fontWeight: 650 }}>Assets</text>
          <text style={{ color: C.mutedForeground, fontSize: 10 }}>({filteredAssets().length + filteredFolders().length})</text>
          <div style={{ flexGrow: 1 }} />
          <AddAssetsMenu onImport={importAsset} onCreateFolder={createFolder} />
        </div>
        <div style={{ paddingLeft: 16, paddingRight: 16, paddingBottom: 10 }}>
          <input testId="diffusion-asset-search" value={query()} placeholder="Search assets" onChange={(event: EventPayload) => setQuery(event.value ?? "")} style={{ height: 28, width: "100%", borderWidth: 1, borderColor: C.borderStrong, borderRadius: 4, backgroundColor: C.input, color: C.foreground, fontSize: 11, paddingLeft: 8, paddingRight: 8 }} />
        </div>
        <div style={{ flexGrow: 1, minHeight: 0, paddingLeft: 12, paddingRight: 12, gap: 3, overflowY: "scroll" }}>
          <For each={filteredFolders()}>
            {(folder, index) => <div testId={`diffusion-folder-${index() + 1}`} style={{ height: 28, display: "flex", flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 6, paddingRight: 6, borderRadius: 4 }}><text style={muted}>▸</text><text style={text}>{folder}</text></div>}
          </For>
          <For each={filteredAssets()}>
            {(asset) => (
              <div testId={`diffusion-asset-${asset.id}`} onClick={() => props.state.setSelectedAsset(asset.id)} style={{ height: 30, display: "flex", flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 6, paddingRight: 6, borderRadius: 4, cursor: "pointer", backgroundColor: props.state.selectedAsset() === asset.id ? C.secondary : "#00000000", hover: { backgroundColor: C.secondaryHover } }}>
                <text style={{ color: asset.kind === "VIDEO" ? C.primary : asset.kind === "AUDIO" ? C.audioPrimary : asset.kind === "IMAGE" ? C.captionBackground : C.meterYellow, fontSize: 9 }}>{asset.kind}</text>
                <text style={{ ...text, flexGrow: 1 }}>{asset.name}</text>
              </div>
            )}
          </For>
        </div>
      </div>
      <div style={{ position: "absolute", left: 10, top: 50 }}>
        <ProjectMenu state={props.state} onImport={importAsset} onRemoveUnused={removeUnused} onDownloadAssets={downloadAssets} />
      </div>
    </div>
  )
}

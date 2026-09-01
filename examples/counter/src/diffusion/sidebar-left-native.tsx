import { For, Show, createMemo, createSignal, type Element as SolidElement } from "solid-js"
import type { EventPayload } from "gpuix-solid"
import { C, type DiffusionEditorState } from "./compat"

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
    <div testId={props.testId} onClick={props.onClick} style={{ height: 28, minWidth: 28, paddingLeft: 7, paddingRight: 7, borderRadius: 6, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", cursor: props.onClick ? "pointer" : "default", backgroundColor: props.active ? C.secondary : "#00000000", hover: props.onClick ? { backgroundColor: C.secondaryHover } : undefined }}>
      {props.children}
    </div>
  )
}

function MenuRow(props: { label: string; shortcut?: string; arrow?: boolean; testId?: string; onClick: () => void }): SolidElement {
  return (
    <div testId={props.testId} onClick={props.onClick} style={{ height: 28, paddingLeft: 8, paddingRight: 8, display: "flex", flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 4, cursor: "pointer", hover: { backgroundColor: C.secondaryHover } }}>
      <text style={{ ...text, flexGrow: 1 }}>{props.label}</text>
      <Show when={props.shortcut}><text style={{ ...muted, fontSize: 9 }}>{props.shortcut}</text></Show>
      <Show when={props.arrow}><text style={{ ...muted, fontSize: 10 }}>›</text></Show>
    </div>
  )
}

function MenuDivider(): SolidElement {
  return <div style={{ height: 1, marginTop: 4, marginBottom: 4, backgroundColor: C.borderStrong }} />
}

function ProjectMenu(props: {
  state: DiffusionEditorState
  onImport: () => void
  onRemoveUnused: () => void
  onDownloadAssets: () => void
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
            <MenuRow label="Download all assets..." onClick={() => { props.onDownloadAssets(); close() }} />
            <MenuDivider />
            <MenuRow label="Remove unused media..." onClick={() => { props.onRemoveUnused(); close() }} />
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
            <MenuRow label="Zoom in" shortcut="⌘+" onClick={() => props.state.setZoom(Math.min(4, props.state.zoom() * 1.25))} />
            <MenuRow label="Zoom out" shortcut="⌘-" onClick={() => props.state.setZoom(Math.max(0.1, props.state.zoom() * 0.8))} />
            <MenuRow label="Zoom to 100%" shortcut="⌘0" onClick={() => props.state.setZoom(1)} />
            <MenuRow label="Zoom to fit" shortcut="⌘1" onClick={() => props.state.setZoom(0.75)} />
            <MenuRow label="Zoom to selection" shortcut="⌘2" onClick={() => props.state.setZoom(1.5)} />
            <MenuDivider />
            <MenuRow label="Toggle UI" onClick={() => { props.state.setUiVisible(!props.state.uiVisible()); close() }} />
            <MenuRow label="Toggle timeline" onClick={() => { props.state.setTimelineMinimized(!props.state.timelineMinimized()); close() }} />
          </Show>

          <Show when={page() === "tool"}>
            <MenuRow label="Generate with AI..." testId="diffusion-menu-generate-ai" onClick={() => localAction("AI prompt requested from project menu")} />
            <MenuDivider />
            <MenuRow label="Scene" shortcut="F" onClick={() => { props.state.setSelectedTool("frame"); close() }} />
            <MenuRow label="Text" shortcut="T" onClick={() => { props.state.setSelectedTool("text"); close() }} />
            <MenuRow label="Rectangle" shortcut="R" onClick={() => { props.state.setSelectedTool("rect"); close() }} />
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
        <ProjectMenu state={props.state} onImport={importAsset} onRemoveUnused={() => setAssets((current) => current.filter((asset) => asset.id === props.state.selectedAsset()))} onDownloadAssets={() => undefined} />
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
        <div style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 12, paddingBottom: 6 }}>
          <input testId="diffusion-asset-search" value={query()} placeholder="Search assets" onChange={(event: EventPayload) => setQuery(event.value ?? "")} style={{ width: "100%", height: 30, paddingLeft: 9, paddingRight: 9, borderWidth: 1, borderColor: C.borderStrong, borderRadius: 6, backgroundColor: C.input, color: C.foreground, fontSize: 11 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 5, paddingLeft: 16, paddingRight: 16, height: 28 }}><text style={muted}>All assets</text><text style={{ ...muted, fontSize: 9 }}>›</text></div>
        <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 10, overflowY: "scroll", flexGrow: 1, minHeight: 0 }}>
          <For each={filteredFolders()}>{(folder, index) => (
            <div testId={`diffusion-folder-${index() + 1}`} style={{ width: 112, height: 58, padding: 7, gap: 5, borderRadius: 7, borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.secondary }}>
              <text style={{ color: C.mutedForeground, fontSize: 10 }}>FOLDER</text><text style={{ color: C.foreground, fontSize: 10 }}>{folder}</text>
            </div>
          )}</For>
          <For each={filteredAssets()} fallback={<Show when={filteredFolders().length === 0}><text style={muted}>No assets</text></Show>}>
            {(asset) => (
              <div testId={`diffusion-asset-${asset.id}`} onClick={() => props.state.setSelectedAsset(asset.id)} style={{ width: 112, height: 82, padding: 7, gap: 5, borderRadius: 7, borderWidth: 1, borderColor: props.state.selectedAsset() === asset.id ? C.primary : C.borderStrong, backgroundColor: props.state.selectedAsset() === asset.id ? C.selection : C.secondary, cursor: "pointer", hover: { backgroundColor: C.secondaryHover } }}>
                <div style={{ flexGrow: 1, borderRadius: 4, alignItems: "center", justifyContent: "center", backgroundColor: C.canvas }}><text style={{ color: C.mutedForeground, fontSize: 10 }}>{asset.kind}</text></div>
                <text style={{ color: C.foreground, fontSize: 10 }}>{asset.name}</text>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  )
}

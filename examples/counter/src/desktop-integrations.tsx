import { writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createSignal } from "solid-js"
import { appMenu, dialog, render, shell } from "gpuix-solid"

function Action(props: { label: string; onClick: () => void }) {
  return (
    <div
      onClick={props.onClick}
      style={{
        paddingTop: 9,
        paddingBottom: 9,
        paddingLeft: 14,
        paddingRight: 14,
        borderRadius: 7,
        backgroundColor: "#2b2b31",
        hover: { backgroundColor: "#393941" },
        cursor: "pointer",
      }}
    >
      <text style={{ color: "#f2f2f3", fontSize: 13 }}>{props.label}</text>
    </div>
  )
}

function App() {
  const [status, setStatus] = createSignal("Ready. Try a system dialog or either drag/drop target.")
  const [dragging, setDragging] = createSignal(false)
  const [dropHot, setDropHot] = createSignal(false)

  const run = (work: () => Promise<void>) => {
    void work().catch((error: Error) => {
      setStatus(error.message)
    })
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: 24,
        backgroundColor: "#151517",
      }}
    >
      <text style={{ color: "#f5f5f6", fontSize: 24, fontWeight: 700 }}>
        Desktop integrations
      </text>
      <text style={{ color: "#a7a7ae", fontSize: 13, lineHeight: 19 }}>
        GPUIX native window + Solid dialogs, shell helpers, native file drops, and the default app menu.
      </text>

      <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Action
          label="Open file…"
          onClick={() => run(async () => {
            const paths = await dialog.openFile({ prompt: "Choose a file for GPUix Solid" })
            setStatus(paths ? `Opened: ${paths.join(", ")}` : "Open cancelled")
          })}
        />
        <Action
          label="Choose folder…"
          onClick={() => run(async () => {
            const paths = await dialog.openFile({ kind: "directory", prompt: "Choose a folder" })
            setStatus(paths ? `Folder: ${paths.join(", ")}` : "Folder selection cancelled")
          })}
        />
        <Action
          label="Save file…"
          onClick={() => run(async () => {
            const path = await dialog.saveFile({ suggestedName: "gpuix-solid.txt" })
            setStatus(path ? `Save path: ${path}` : "Save cancelled")
          })}
        />
        <Action
          label="Message…"
          onClick={() => run(async () => {
            const answer = await dialog.message({
              message: "GPUix Solid desktop integration",
              detail: "This dialog is owned by the operating system.",
            })
            setStatus(`Message answer index: ${answer ?? "cancelled"}`)
          })}
        />
        <Action
          label="Reveal temp file"
          onClick={() => run(async () => {
            const path = join(tmpdir(), "gpuix-solid-desktop-integration.txt")
            await writeFile(path, "GPUix Solid desktop integration\n", "utf8")
            await shell.revealPath(path)
            setStatus(`Revealed: ${path}`)
          })}
        />
        <Action
          label="Open GPUIX"
          onClick={() => run(async () => {
            await shell.openWithSystem("https://github.com/remorses/gpuix")
            setStatus("Opened GPUIX with the system handler")
          })}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "row", gap: 12 }}>
        <div
          testId="desktop-drag-source"
          dragData={{ kind: "demo-card", id: 1 }}
          onDragStart={() => {
            setDragging(true)
            setStatus("Internal drag started")
          }}
          onDragEnd={() => {
            setDragging(false)
            setDropHot(false)
          }}
          style={{
            width: 180,
            height: 88,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 10,
            backgroundColor: dragging() ? "#365e8d" : "#294969",
            cursor: "grab",
          }}
        >
          <text style={{ color: "#e5f0ff", fontSize: 13 }}>Drag this card</text>
        </div>
        <div
          testId="desktop-internal-drop-target"
          onDragOver={() => setDropHot(true)}
          onMouseLeave={() => setDropHot(false)}
          onDrop={(event) => {
            setDropHot(false)
            setStatus(`Internal drop: ${JSON.stringify(event.dragData)}`)
          }}
          style={{
            flexGrow: 1,
            height: 88,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: dropHot() ? "#7cb6ff" : "#4b4b55",
            borderRadius: 10,
            backgroundColor: dropHot() ? "#213a58" : "#1d1d21",
          }}
        >
          <text style={{ color: "#c7c7ce", fontSize: 13 }}>Drop the card here</text>
        </div>
      </div>

      <div
        testId="desktop-drop-target"
        onFileDrop={(event) => {
          const paths = event.paths ?? []
          setStatus(paths.length === 0 ? "Drop contained no paths" : `Dropped: ${paths.join(", ")}`)
        }}
        style={{
          flexGrow: 1,
          minHeight: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "#4b4b55",
          borderRadius: 12,
          backgroundColor: "#1d1d21",
        }}
      >
        <text style={{ color: "#c7c7ce", fontSize: 14 }}>Drop files here from Finder</text>
      </div>

      <div
        testId="desktop-status"
        style={{
          padding: 12,
          borderRadius: 8,
          backgroundColor: "#202025",
        }}
      >
        <text style={{ color: "#b9d5ff", fontSize: 12, lineHeight: 18 }}>{status()}</text>
      </div>
    </div>
  )
}

render(() => <App />, {
  title: "GPUix Solid Desktop Integrations",
  ...appMenu.default("GPUix Solid"),
  width: 760,
  height: 560,
})

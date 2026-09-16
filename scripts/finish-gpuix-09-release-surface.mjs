import { readFileSync, writeFileSync } from "node:fs"

function replace(path, from, to, expected = 1) {
  const source = readFileSync(path, "utf8")
  const found = source.split(from).length - 1
  if (found !== expected) {
    throw new Error(`${path}: expected ${expected} occurrence(s), found ${found}: ${from.slice(0, 80)}`)
  }
  writeFileSync(path, source.replaceAll(from, to))
}

replace(
  "README.md",
  "Both packages target `@gpuix/native ^0.8.0`. The stable Solid 2 line is published on npm `latest`. Solid 1 keeps its own package version and release cycle.",
  "Both packages now target the exact `@gpuix/native@0.9.0` contract. The repository is preparing the Solid 2 `0.2.0` line; npm `latest` remains the last published stable version until that release lands. Solid 1 keeps its own package version and release cycle.",
)
replace(
  "README.md",
  "| GPUIX 0.8 surface | 2 | `bun run example:gpuix-08` | accessibility metadata, focus, textarea input, text decoration |",
  "| GPUIX 0.9 surface | 2 | `bun run example:gpuix-08` | accessibility metadata, textarea input, text decoration, reactive window selection |",
)
replace("README.md", "## GPUIX 0.8 baseline", "## GPUIX 0.9 baseline")
replace(
  "README.md",
  "Both renderer packages consume the published GPUIX 0.8 native contract.",
  "Both renderer packages consume the exact published GPUIX 0.9 native contract. GPUIX 0.9 adds window-level selection-change events and includes the upstream native click/selection ownership fix; GPUix Solid exposes the event at the root boundary and as the Solid-native `createTextSelection()` primitive.",
)
replace(
  "README.md",
  "Repository CI validates macOS, Ubuntu, Windows, the Solid 1 package and consumers, the Solid 2 package tarball, source-pinned examples, and the exact GPUIX 0.8 source compatibility lane.",
  "Repository CI validates macOS, Ubuntu, Windows, the Solid 1 package and consumers, the Solid 2 package tarball, source-pinned examples, and the exact GPUIX 0.9 source compatibility lane.",
)

replace(
  "docs/getting-started.md",
  "The stable `0.1.x` line targets:",
  "The repository's next `0.2.x` line targets:",
)
replace("docs/getting-started.md", "- `@gpuix/native ^0.8.0`", "- exact `@gpuix/native 0.9.0`")
replace(
  "docs/getting-started.md",
  "A copyable Solid 2 project lives at [`templates/solid2-vite-bun`](../templates/solid2-vite-bun). It depends on the stable `^0.1.0` package line rather than a prerelease dist-tag.",
  "A copyable Solid 2 project lives at [`templates/solid2-vite-bun`](../templates/solid2-vite-bun). Until `0.2.0` is published, that public-install starter intentionally remains on the published `^0.1.0` line. It will move to `^0.2.0` only after npm can resolve that version in a clean external install.",
)
replace(
  "docs/getting-started.md",
  "Repository CI continuously checks the GPUIX 0.8 package line on:",
  "Repository CI continuously checks the GPUIX 0.9 package line on:",
)

replace("docs/getting-started-solid1.md", "- `@gpuix/native ^0.8.0`", "- exact `@gpuix/native 0.9.0`")

replace(
  "docs/compatibility.md",
  "| `gpuix-solid` | stable `0.1.x` line from npm `latest` | Solid 2 renderer in `packages/solid` |",
  "| `gpuix-solid` | repository target `0.2.0`; npm `latest` remains the last published stable until release | Solid 2 renderer in `packages/solid` |",
)
replace(
  "docs/compatibility.md",
  "| `@gpuix/native` | `^0.8.0` | Native desktop renderer contract used by both Solid packages |",
  "| `@gpuix/native` | exact `0.9.0` | Native desktop renderer contract used by both Solid packages; exact pairing follows GPUIX's pre-1.0 version policy |",
)
replace(
  "docs/compatibility.md",
  "| pinned GPUIX source edge | `8d3ec094387152558d05a5b37de3cfbfca5d2d0a` | Exact source reference used for the published 0.8.0 baseline |",
  "| pinned GPUIX source edge | `7ac9880abd8e91e5bf0e4feb0fa850729cf95a68` | Exact source reference for the published 0.9.0 baseline |",
)
replace(
  "docs/compatibility.md",
  "The repository continuously exercises the GPUIX 0.8 native packages for:",
  "The repository continuously exercises the GPUIX 0.9 native packages for:",
)
replace("docs/compatibility.md", "## GPUIX 0.8 support", "## GPUIX 0.9 support")
replace(
  "docs/compatibility.md",
  "The Solid host mappings cover the GPUIX 0.8 behavior that has explicit Solid tests or runnable examples. That includes accessibility metadata, focus and tab metadata, text decoration, controlled textarea input, HTTP images in the Mail example, and the native event and window contract consumed through `@gpuix/native`.",
  "The Solid host mappings cover the GPUIX 0.9 behavior that has explicit Solid tests or runnable examples. That includes accessibility metadata, focus and tab metadata, text decoration, controlled textarea input, HTTP images in the Mail example, window-level selection-change events, and the native event/window contract consumed through `@gpuix/native`. The app-facing selection API is `createTextSelection()`, which returns a Solid accessor and follows owner cleanup rather than React component-state conventions.",
)
replace(
  "docs/compatibility.md",
  "That result is the stable `0.1.0` qualification record. It does not prove that the upstream source-level ownership concern was removed. Keep the diagnostic history in [`release-candidate.md`](./release-candidate.md) and [`upstream-parity.md`](./upstream-parity.md).",
  "That result is the stable `0.1.0` qualification record. GPUIX 0.9 subsequently shipped the native click/selection ownership fix, so the old 0.8 source-level concern is historical rather than a current 0.9 blocker. Keep the diagnostic history in [`release-candidate.md`](./release-candidate.md) and [`upstream-parity.md`](./upstream-parity.md).",
)

replace(
  "packages/solid/README.md",
  "The stable `0.1.x` line targets `@gpuix/native ^0.8.0`. The package peer range is `solid-js ^2.0.0-rc.0`, and release qualification exercises `solid-js@2.0.0-rc.1`.",
  "The repository's next `0.2.x` line targets exact `@gpuix/native@0.9.0`. The package peer range is `solid-js ^2.0.0-rc.0`, and release qualification exercises `solid-js@2.0.0-rc.1`.",
)

replace(
  "packages/solid1/README.md",
  "The Solid 1 package declares `solid-js >=1.9.0 <2` as its peer range. Repository CI currently exercises `solid-js@1.9.15` against `@gpuix/native ^0.8.0`.",
  "The Solid 1 package declares `solid-js >=1.9.0 <2` as its peer range. Repository CI currently exercises `solid-js@1.9.15` against exact `@gpuix/native@0.9.0`.",
)

replace(
  "examples/README.md",
  "All Solid 2 examples run through the `gpuix-solid` workspace package and the published `@gpuix/native ^0.8.0` contract.",
  "All Solid 2 examples run through the `gpuix-solid` workspace package and the exact published `@gpuix/native@0.9.0` contract.",
)
replace(
  "examples/README.md",
  "| GPUIX 0.8 surface | `bun run example:gpuix-08` | Focused Solid proof for accessibility metadata, accessible click, textarea Enter/newline behavior, and `textDecoration` |",
  "| GPUIX 0.9 surface | `bun run example:gpuix-08` | Focused Solid proof for accessibility metadata, accessible click, textarea Enter/newline behavior, `textDecoration`, and reactive window selection |",
)

replace(
  "examples/solid1-daw/UPSTREAM.md",
  "The repository targets the latest reviewed GPUIX release line, `@gpuix/native ^0.8.0`, rather than floating production dependencies to an unreleased upstream commit. The root lock resolves `0.8.0` reproducibly.",
  "The repository targets the latest reviewed GPUIX release line, exact `@gpuix/native@0.9.0`, rather than floating production dependencies to an unreleased upstream commit. The root lock resolves `0.9.0` reproducibly.",
)

replace("docs/mail-react-solid-parity.md", "exact GPUIX 0.8.0 React reference", "exact GPUIX 0.9.0 React reference")
replace("docs/mail-react-solid-parity.md", "exact React 0.8.0 versus", "exact React 0.9.0 versus")
replace("docs/mail-react-solid-parity.md", "exact 0.8.0 Mail source", "exact 0.9.0 Mail source")
replace("docs/mail-react-solid-parity.md", ".cache/gpuix/remorses--gpuix-8d3ec0943871", ".cache/gpuix/remorses--gpuix-7ac9880abd8e")

replace(
  "docs/upstream-parity.md",
  "GPUix Solid treats `remorses/gpuix` as the native capability baseline. The published package baseline is now GPUIX 0.8. This document separates three things that should not be conflated:",
  "GPUix Solid treats `remorses/gpuix` as the native capability baseline. The current repository baseline is GPUIX 0.9. This document separates three things that should not be conflated:",
)
replace("docs/upstream-parity.md", "1. the published 0.8 native/React contract GPUix Solid installs;", "1. the published 0.9 native/React contract GPUix Solid installs;")
replace("docs/upstream-parity.md", "- Published React baseline: `@gpuix/react@0.8.0`", "- Published React baseline: `@gpuix/react@0.9.0`")
replace("docs/upstream-parity.md", "- Published/native 0.8 source commit: `8d3ec094387152558d05a5b37de3cfbfca5d2d0a`", "- Published/native 0.9 source commit: `7ac9880abd8e91e5bf0e4feb0fa850729cf95a68`")
replace("docs/upstream-parity.md", "- Native package used by GPUix Solid: `@gpuix/native ^0.8.0`", "- Native package used by GPUix Solid: exact `@gpuix/native@0.9.0`")
replace("docs/upstream-parity.md", "- Audited source-edge commit: `8d3ec094387152558d05a5b37de3cfbfca5d2d0a`", "- Audited source-edge commit: `7ac9880abd8e91e5bf0e4feb0fa850729cf95a68`")
replace(
  "docs/upstream-parity.md",
  "The native dependency and source-edge lane now point at the exact published 0.8 baseline.",
  "The native dependency and source-edge lane now point at the exact published 0.9 baseline.",
)
replace(
  "docs/upstream-parity.md",
  "Runtime/native execution now uses the 0.8 package baseline; the snapshot is not silently rewritten to whatever happens to be on upstream `main`.",
  "Runtime/native execution now uses the 0.9 package baseline; the snapshot is not silently rewritten to whatever happens to be on upstream `main`.",
)
replace("docs/upstream-parity.md", "## Published 0.8 API parity", "## Published 0.9 API parity")
replace(
  "docs/upstream-parity.md",
  "The package baseline is the published React/native 0.8 line. Existing 0.7-compatible behavior remains covered, and 0.8 additions are only marked parity where the Solid surface is actually mapped and checked.",
  "The package baseline is the published React/native 0.9 line. Existing behavior remains covered, and 0.9 additions are only marked parity where the Solid surface is actually mapped and checked.",
)
replace(
  "docs/upstream-parity.md",
  "| Physical primary mouse-up | upstream 0.8 click delivery | **known native foreground re-entrancy blocker on affected macOS runs**; see below |",
  "| Physical primary mouse-up | upstream click delivery | parity on the 0.9 native line; 0.9 includes the native ownership fix for the earlier 0.8 click/selection panic |\n| Window text selection | 0.9 `onSelectionChange` / native selection subscription | root parity plus Solid-native `createTextSelection()` accessor primitive in Solid 1 and Solid 2 |",
)
replace("docs/upstream-parity.md", "### Known physical foreground ownership defect", "### Historical 0.8 physical foreground ownership defect")
replace(
  "docs/upstream-parity.md",
  "The published `@gpuix/native@0.8.0` source still has a physical foreground mouse-up path where text-selection cleanup can synchronously call back into the root `GpuixView` while GPUI already owns that entity update. On affected macOS foreground runs the process can abort with `GpuixView already being updated` before the Solid click handler receives control.",
  "The published `@gpuix/native@0.8.0` source had a physical foreground mouse-up path where text-selection cleanup could synchronously call back into the root `GpuixView` while GPUI already owned that entity update. On affected macOS foreground runs the process could abort with `GpuixView already being updated` before the Solid click handler received control. GPUIX 0.9 ships the native ownership fix, and GPUix Solid's 0.9 qualification keeps a real click/selection regression so this does not silently return.",
)
replace(
  "docs/upstream-parity.md",
  "That overlay is **diagnostic evidence, not part of beta.6**. Published beta.6 deliberately consumes the real 0.8.0 package and documents the limitation until upstream releases the fix.",
  "That overlay remains historical diagnostic evidence for the 0.8 line. The current 0.9 baseline consumes the upstream fix directly; GPUix Solid does not carry the rejected Solid-side workaround.",
)
replace("docs/upstream-parity.md", "## 0.8 release deltas adopted", "## 0.9 release deltas adopted")
replace(
  "docs/upstream-parity.md",
  "The 0.8 release moves capabilities that were previously source-edge-only into the published native line, including accessibility/ARIA plumbing, text-decoration styling, primary mouse-up click delivery, textarea newline behavior, HTTP image loading, macOS event-pump changes, input/caret fixes, and runtime-error resilience. The current release also includes additional native window/file-drop work that is audited at the Solid boundary before being advertised as parity.",
  "The 0.9 release keeps the 0.8 capability set and adds the window-level selection-change callback plus the native click/selection ownership fix. GPUix Solid maps that new event into both renderer roots and exposes `createTextSelection()` as the normal Solid API, while retaining root callback parity for lower-level consumers.",
)
replace(
  "docs/upstream-parity.md",
  "GPUix Solid does not vendor those Rust changes. Both Solid renderers consume `@gpuix/native ^0.8.0`, and `.gpuix/edge.json` pins the exact 0.8 source commit so the source-build lane and published package baseline now agree.",
  "GPUix Solid does not vendor those Rust changes. Both Solid renderers consume exact `@gpuix/native@0.9.0`, and `.gpuix/edge.json` pins the exact 0.9 source commit so the source-build lane and published package baseline agree.",
)
replace("docs/upstream-parity.md", "## 0.8 capability promotion policy", "## 0.9 capability promotion policy")
replace(
  "docs/upstream-parity.md",
  "For each newly useful 0.8 capability, promotion requires:",
  "For each newly useful 0.9 capability, promotion requires:",
)

writeFileSync("examples/counter/src/gpuix-08/app.tsx", `import { Show, createSignal } from "solid-js"
import { createTextSelection, type EventPayload } from "gpuix-solid"

const cardStyle = {
  width: "100%",
  padding: 18,
  gap: 12,
  flexDirection: "column",
  borderWidth: 1,
  borderColor: "#303030",
  borderRadius: 10,
  backgroundColor: "#1d1d1d",
} as const

export function Gpuix08Showcase() {
  const [accessibleClicks, setAccessibleClicks] = createSignal(0)
  const [note, setNote] = createSignal("")
  const selection = createTextSelection()

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: 28,
        gap: 16,
        flexDirection: "column",
        backgroundColor: "#141414",
      }}
    >
      <text style={{ color: "#f5f5f5", fontSize: 26, fontWeight: 650 }}>
        GPUIX 0.9 · Solid surface
      </text>
      <text style={{ color: "#9d9d9d", fontSize: 14 }}>
        Focused checks for native metadata, text input, styling, and reactive window selection.
      </text>

      <div style={cardStyle}>
        <text style={{ color: "#f5f5f5", fontSize: 17, fontWeight: 600 }}>
          Accessibility metadata
        </text>
        <div
          testId="accessible-action"
          role="button"
          aria-label="Run accessible action"
          aria-id="gpuix08.accessible-action"
          tabIndex={0}
          onClick={() => setAccessibleClicks((value) => value + 1)}
          style={{
            width: 190,
            padding: 11,
            borderRadius: 8,
            cursor: "pointer",
            backgroundColor: "#2c2c2c",
            hover: { backgroundColor: "#383838" },
          }}
        >
          <text style={{ color: "#f5f5f5" }}>Run accessible action</text>
        </div>
        <text testId="accessible-count" style={{ color: "#a6a6a6", fontSize: 13 }}>
          Accessible clicks: {accessibleClicks()}
        </text>
      </div>

      <div style={cardStyle}>
        <text style={{ color: "#f5f5f5", fontSize: 17, fontWeight: 600 }}>
          Text decoration
        </text>
        <text
          testId="decorated-text"
          style={{ color: "#d8d8d8", fontSize: 17, textDecoration: "underline" }}
        >
          Underlined by the native 0.9 renderer
        </text>
        <text style={{ color: "#858585", fontSize: 14, textDecoration: "line-through" }}>
          Line-through uses the same public style property
        </text>
      </div>

      <div style={cardStyle}>
        <text style={{ color: "#f5f5f5", fontSize: 17, fontWeight: 600 }}>
          Reactive window selection
        </text>
        <text testId="selection-source" style={{ color: "#d8d8d8", fontSize: 15 }}>
          Select this GPUIX 0.9 text
        </text>
        <Show
          when={selection.text()}
          fallback={<text testId="selection-value" style={{ color: "#858585", fontSize: 13 }}>Selection: none</text>}
        >
          {(text) => (
            <text testId="selection-value" style={{ color: "#a6a6a6", fontSize: 13 }}>
              Selection: {text()}
            </text>
          )}
        </Show>
        <div
          testId="clear-selection"
          role="button"
          tabIndex={0}
          onClick={selection.clear}
          style={{ width: 140, padding: 9, borderRadius: 8, cursor: "pointer", backgroundColor: "#2c2c2c" }}
        >
          <text style={{ color: "#f5f5f5" }}>Clear selection</text>
        </div>
      </div>

      <div style={cardStyle}>
        <text style={{ color: "#f5f5f5", fontSize: 17, fontWeight: 600 }}>
          Textarea Enter/newline
        </text>
        <textarea
          testId="newline-editor"
          value={note()}
          placeholder="Press Enter to insert a newline"
          minRows={2}
          maxRows={4}
          onChange={(event: EventPayload) => setNote(event.value ?? "")}
          style={{
            width: "100%",
            minHeight: 72,
            padding: 10,
            color: "#f5f5f5",
            backgroundColor: "#202020",
            borderWidth: 1,
            borderColor: "#3a3a3a",
            borderRadius: 8,
          }}
        />
        <text testId="newline-value" style={{ color: "#9d9d9d", fontSize: 13 }}>
          Textarea value: {JSON.stringify(note())}
        </text>
      </div>
    </div>
  )
}
`)

writeFileSync("examples/counter/src/gpuix-08/test.tsx", `import assert from "node:assert/strict"
import { createTestApp, createTestRoot, hasNativeTestRenderer, type TestElement } from "gpuix-solid"
import { Gpuix08Showcase } from "./app"

function requiredBounds(
  root: ReturnType<typeof createTestRoot>,
  element: TestElement,
): [number, number, number, number] {
  const bounds = root.renderer.getElementBounds(element.id)
  if (!bounds || bounds.length < 4) throw new Error(\`Missing bounds for element \${element.id}\`)
  const [x, y, width, height] = bounds
  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    throw new Error(\`Incomplete bounds for element \${element.id}\`)
  }
  return [x, y, width, height]
}

async function main(): Promise<void> {
  if (!hasNativeTestRenderer) {
    console.log("GPUIX 0.9 Solid showcase: native TestGpuixRenderer unavailable; skipped")
    return
  }

  const testRoot = createTestRoot(860, 900)
  testRoot.render(() => <Gpuix08Showcase />)
  const app = createTestApp(testRoot.renderer)

  try {
    const actionNode = await app.getByTestId("accessible-action").element()
    const action = testRoot.renderer.getElement(actionNode.id)
    assert.ok(action, "accessible action should exist in the retained tree")
    assert.equal(action.customProps?.role, "button")
    assert.equal(action.customProps?.["aria-label"], "Run accessible action")
    assert.equal(action.customProps?.["aria-id"], "gpuix08.accessible-action")

    await app.getByTestId("accessible-action").click()
    assert.equal(await app.getByTestId("accessible-count").textContent(), "Accessible clicks: 1")

    const decoratedNode = await app.getByTestId("decorated-text").element()
    const decorated = testRoot.renderer.getElement(decoratedNode.id)
    assert.ok(decorated, "decorated text should exist in the retained tree")
    assert.equal(decorated.style.textDecoration, "underline")

    const selectionSource = await app.getByTestId("selection-source").element()
    const [x, y, width, height] = requiredBounds(testRoot, selectionSource)
    const selected = testRoot.renderer.dragSelect(x + 2, y + height / 2, x + width - 2, y + height / 2)
    assert.equal(selected, "Select this GPUIX 0.9 text")
    assert.equal(
      await app.getByTestId("selection-value").textContent(),
      "Selection: Select this GPUIX 0.9 text",
    )
    await app.getByTestId("clear-selection").click()
    assert.equal(await app.getByTestId("selection-value").textContent(), "Selection: none")

    await app.getByTestId("newline-editor").fill("\\n")
    assert.equal(await app.getByTestId("newline-value").textContent(), 'Textarea value: "\\\\n"')

    console.log("GPUIX 0.9 Solid showcase: metadata, selection, textarea newline, and text decoration passed")
  } finally {
    await app.close()
    testRoot.unmount()
  }
}

await main()
`)

console.log("GPUIX 0.9 release-facing docs and example staged")

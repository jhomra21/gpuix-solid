import { createSignal } from "solid-js"
import type { EventPayload } from "gpuix-solid"

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
        GPUIX 0.8 · Solid surface
      </text>
      <text style={{ color: "#9d9d9d", fontSize: 14 }}>
        Focused checks for accessibility metadata, textarea newline behavior, and text decoration.
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
          Underlined by the native 0.8 renderer
        </text>
        <text style={{ color: "#858585", fontSize: 14, textDecoration: "line-through" }}>
          Line-through uses the same public style property
        </text>
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

import type { JSX } from "solid-js"

export function SemanticSvgProbe(): JSX.Element {
  return (
    <div testId="semantic-svg-probe" style={{ width: 220, padding: 12, display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
      <svg
        testId="inline-svg"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        style={{ width: 24, height: 24, color: "#3b82f6" }}
      >
        <path d="M18 6l-12 12" />
        <path d="M6 6l12 12" />
      </svg>
      <span testId="semantic-span" style={{ fontSize: 12, color: "#fafafa" }}>Semantic span</span>
    </div>
  )
}

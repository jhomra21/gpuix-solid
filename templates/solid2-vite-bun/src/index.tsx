import { render } from "gpuix-solid"
import { createSignal } from "solid-js"

function App() {
  const [count, setCount] = createSignal(0)

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: 32,
        gap: 18,
        flexDirection: "column",
        backgroundColor: "#151515",
      }}
    >
      <text
        style={{
          color: "#f7f7f7",
          fontSize: 28,
          fontWeight: 650,
        }}
      >
        GPUix Solid starter
      </text>

      <text style={{ color: "#a8a8a8", fontSize: 15 }}>
        Solid 2 signals driving a native GPUIX 0.9 retained tree.
      </text>

      <text style={{ color: "#f7f7f7", fontSize: 20 }}>
        Count: {count()}
      </text>

      <div
        role="button"
        aria-label="Increment counter"
        tabIndex={0}
        onClick={() => setCount((value) => value + 1)}
        style={{
          width: 160,
          padding: 12,
          borderRadius: 8,
          cursor: "pointer",
          backgroundColor: "#2b2b2b",
          hover: { backgroundColor: "#383838" },
        }}
      >
        <text style={{ color: "#f7f7f7" }}>Increment</text>
      </div>

      <text
        style={{
          color: "#7d7d7d",
          fontSize: 13,
          textDecoration: "underline",
        }}
      >
        Native window. No Electron and no web view.
      </text>
    </div>
  )
}

render(() => <App />, {
  title: "GPUix Solid Starter",
  width: 720,
  height: 480,
})

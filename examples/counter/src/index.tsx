import { render } from "@jhomra21/gpuix-solid"
import { createSignal } from "solid-js"

function App() {
  const [count, setCount] = createSignal(0)

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: 24,
        gap: 12,
        flexDirection: "column",
        backgroundColor: "#111111",
      }}
    >
      <text style={{ color: "#f5f5f5", fontSize: 20 }}>Solid GPUIX</text>
      <text style={{ color: "#b5b5b5" }}>Count: {count()}</text>
      <div
        testId="increment"
        tabIndex={0}
        onClick={() => setCount((value) => value + 1)}
        style={{
          padding: 12,
          borderRadius: 8,
          backgroundColor: "#242424",
          cursor: "pointer",
        }}
      >
        <text style={{ color: "#ffffff" }}>Increment</text>
      </div>
    </div>
  )
}

render(() => <App />, {
  title: "Solid GPUIX Counter",
  width: 720,
  height: 480,
})

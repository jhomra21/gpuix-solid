import { render } from "@jhomra21/gpuix-solid"
import { createSignal } from "solid-js"

function Counter() {
  const [count, setCount] = createSignal(0)
  const [hovered, setHovered] = createSignal(false)

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 32,
        width: 400,
        height: 300,
        backgroundColor: "#1e1e2e",
        borderRadius: 12,
      }}
    >
      <div
        testId="counter-value"
        style={{
          fontSize: 48,
          fontWeight: "bold",
          color: "#cdd6f4",
          cursor: "pointer",
        }}
        onClick={() => setCount((value) => value + 1)}
      >
        {count()}
      </div>

      <div style={{ color: "#a6adc8", fontSize: 14 }}>
        Click the number or + to increment
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <div
          style={{
            padding: 12,
            paddingLeft: 24,
            paddingRight: 24,
            backgroundColor: count() > 0 ? "#f38ba8" : "#6c7086",
            borderRadius: 8,
            cursor: count() > 0 ? "pointer" : "default",
            opacity: count() > 0 ? 1 : 0.5,
          }}
          onClick={() => {
            if (count() > 0) setCount((value) => value - 1)
          }}
        >
          <div style={{ color: "#1e1e2e", fontWeight: "bold" }}>-</div>
        </div>

        <div
          testId="counter-increment"
          style={{
            padding: 12,
            paddingLeft: 24,
            paddingRight: 24,
            backgroundColor: hovered() ? "#94e2d5" : "#a6e3a1",
            borderRadius: 8,
            cursor: "pointer",
          }}
          onClick={() => setCount((value) => value + 1)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div style={{ color: "#1e1e2e", fontWeight: "bold" }}>+</div>
        </div>
      </div>

      <div
        testId="counter-reset"
        style={{
          marginTop: 16,
          padding: 16,
          backgroundColor: "#313244",
          borderRadius: 8,
          cursor: "pointer",
        }}
        onClick={() => setCount(0)}
      >
        <div style={{ color: "#bac2de", fontSize: 14 }}>Reset</div>
      </div>
    </div>
  )
}

function App() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        backgroundColor: "#11111b",
      }}
    >
      <Counter />
    </div>
  )
}

render(() => <App />, {
  title: "Solid GPUIX Counter",
  width: 800,
  height: 600,
})

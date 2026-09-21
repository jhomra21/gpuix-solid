import { createSignal } from "solid-js"
import { render } from "gpuix-solid"
import { WaveformApp } from "./app"

function App() {
  const [phase, setPhase] = createSignal(0)

  return (
    <div
      style={{ width: "100%", height: "100%" }}
      onClick={() => setPhase((value) => value + 0.6)}
    >
      <WaveformApp phase={phase()} />
    </div>
  )
}

render(() => <App />, {
  title: "GPUix Solid · Waveform",
  width: 800,
  height: 420,
})

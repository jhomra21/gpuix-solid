import { Show, createSignal, onCleanup } from "solid-js"
import { animate, render, type EventPayload } from "gpuix-solid"

const glass = {
  display: "flex" as const,
  flexDirection: "column" as const,
  backgroundColor: "#FFFFFF0D",
  borderWidth: 1,
  borderColor: "#FFFFFF1F",
  borderRadius: 16,
}

const muted = "#FFFFFF99"
const BUTTON_GROW_DURATION = 0.15
const LABEL_ANIMATION_DURATION_MS = BUTTON_GROW_DURATION * 1000

function Metric(props: { label: string; value: string }) {
  return (
    <div style={{ ...glass, flexGrow: 1, gap: 7, padding: 16 }}>
      <text style={{ color: muted, fontSize: 12 }}>{props.label}</text>
      <text style={{ color: "#FFFFFF", fontSize: 22, fontWeight: 600 }}>{props.value}</text>
    </div>
  )
}

function Welcome(props: { onSubmit: (name: string) => void }) {
  const [name, setName] = createSignal("")
  const hasName = () => name().trim().length > 0
  const [labelProgress, setLabelProgress] = createSignal(0)
  let currentLabelProgress = 0
  let labelAnimation: ReturnType<typeof setTimeout> | undefined
  let labelAnimationId = 0
  const [surfaceVisible, setSurfaceVisible] = createSignal(false)
  let surfaceHideTimer: ReturnType<typeof setTimeout> | undefined

  const animateLabel = (target: number): void => {
    const from = currentLabelProgress
    const startedAt = performance.now()
    const animationId = ++labelAnimationId
    if (labelAnimation !== undefined) clearTimeout(labelAnimation)

    const step = (): void => {
      if (animationId !== labelAnimationId) return
      const linearProgress = Math.min(1, (performance.now() - startedAt) / LABEL_ANIMATION_DURATION_MS)
      currentLabelProgress = from + (target - from) * linearProgress
      setLabelProgress(currentLabelProgress)
      if (linearProgress < 1) labelAnimation = setTimeout(step, 16)
      else labelAnimation = undefined
    }

    step()
  }

  onCleanup(() => {
    labelAnimationId += 1
    if (labelAnimation !== undefined) clearTimeout(labelAnimation)
    if (surfaceHideTimer !== undefined) clearTimeout(surfaceHideTimer)
  })

  const submit = (): void => {
    const value = name().trim()
    if (value) props.onSubmit(value)
  }

  const handleNameChange = (event: EventPayload): void => {
    const value = event.value ?? ""
    setName(value)
    const visible = value.trim().length > 0
    animateLabel(visible ? 1 : 0)
    if (visible) {
      if (surfaceHideTimer !== undefined) clearTimeout(surfaceHideTimer)
      setSurfaceVisible(true)
    } else {
      surfaceHideTimer = setTimeout(() => setSurfaceVisible(false), BUTTON_GROW_DURATION * 1000)
    }
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0A101826",
      }}
    >
      <animate.div
        initial={{ opacity: 0, top: 18 }}
        to={{ opacity: 1, top: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        style={{ position: "relative", width: 420, gap: 12 }}
      >
        <text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: 600 }}>Enter your name</text>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            width: "100%",
            height: 46,
            borderWidth: 1,
            borderColor: "#FFFFFF1F",
            borderRadius: 10,
            backgroundColor: "#FFFFFF0D",
            overflow: "hidden",
          }}
        >
          <input
            testId="username"
            autoFocus
            value={name()}
            placeholder="Your name"
            onChange={handleNameChange}
            onSubmit={submit}
            theme={{ caret: "#FFFFFF" }}
            style={{
              flexGrow: 1,
              minWidth: 0,
              height: "100%",
              borderWidth: 0,
              backgroundColor: "#00000000",
              color: "#FFFFFF",
              fontSize: 15,
              paddingLeft: 14,
              paddingRight: 14,
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 84,
              height: "100%",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            <animate.div
              initial={{ width: 28, height: 28 }}
              to={{
                width: hasName() ? 84 : 28,
                height: hasName() ? 46 : 28,
              }}
              transition={{ duration: BUTTON_GROW_DURATION, ease: "linear" }}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}
            >
              <Show when={surfaceVisible()}>
                <div
                  testId="username-submit"
                  onClick={submit}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 84,
                    height: 46,
                    flexShrink: 0,
                    borderLeftWidth: 1,
                    borderColor: "#FFFFFF1F",
                    backgroundColor: "#FFFFFFD9",
                    cursor: "pointer",
                    hover: { backgroundColor: "#FFFFFFD9" },
                    active: { backgroundColor: "#FFFFFFB8" },
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 20, flexShrink: 0 }}>
                    <text style={{ color: "#17181C", fontSize: Math.max(1, 13 * labelProgress()), fontWeight: 650, opacity: labelProgress() }}>Enter</text>
                  </div>
                </div>
              </Show>
            </animate.div>
          </div>
        </div>
      </animate.div>
    </div>
  )
}

function Main(props: { name: string }) {
  const tasks = [
    ["09:30", "Review the GPUI window API"],
    ["11:00", "Build the glass example"],
    ["14:30", "Walk and reset"],
  ] as const

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: 22,
        paddingTop: 58,
        gap: 18,
        backgroundColor: "#0A101826",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ gap: 5 }}>
          <text style={{ color: muted, fontSize: 12, fontWeight: 600 }}>SUNDAY, AUGUST 30</text>
          <text style={{ color: "#FFFFFF", fontSize: 30, fontWeight: 650 }}>{`Good morning, ${props.name}`}</text>
        </div>
        <div
          style={{
            ...glass,
            paddingTop: 9,
            paddingBottom: 9,
            paddingLeft: 14,
            paddingRight: 14,
          }}
        >
          <text style={{ color: "#FFFFFFCC", fontSize: 13 }}>Cupertino · 21°</text>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "row", gap: 12 }}>
        <Metric label="FOCUS TIME" value="3h 24m" />
        <Metric label="TASKS DONE" value="8 / 11" />
        <Metric label="ENERGY" value="High" />
      </div>

      <div style={{ display: "flex", flexDirection: "row", flexGrow: 1, gap: 14 }}>
        <div style={{ ...glass, flexGrow: 1, padding: 20, gap: 18 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ gap: 4 }}>
              <text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: 600 }}>Today</text>
              <text style={{ color: muted, fontSize: 13 }}>A light plan for a quiet Sunday</text>
            </div>
            <div style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: "#79E6B3" }} />
          </div>

          {tasks.map(([time, task], index) => (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 14 }}>
                <text style={{ width: 48, color: "#FFFFFF73", fontSize: 12 }}>{time}</text>
                <text style={{ color: "#FFFFFFE8", fontSize: 14 }}>{task}</text>
              </div>
              {index < 2 && <div style={{ height: 1, backgroundColor: "#FFFFFF17" }} />}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", width: 220, gap: 14 }}>
          <div style={{ ...glass, flexGrow: 1, padding: 18, justifyContent: "space-between" }}>
            <div style={{ gap: 5 }}>
              <text style={{ color: muted, fontSize: 12, fontWeight: 600 }}>NOW PLAYING</text>
              <text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: 600 }}>Soft Focus</text>
              <text style={{ color: "#FFFFFF80", fontSize: 13 }}>Leavv</text>
            </div>
            <div style={{ gap: 8 }}>
              <div style={{ height: 3, borderRadius: 2, backgroundColor: "#FFFFFF29" }}>
                <div style={{ width: "62%", height: "100%", borderRadius: 2, backgroundColor: "#FFFFFFD9" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
                <text style={{ color: "#FFFFFF70", fontSize: 11 }}>2:08</text>
                <text style={{ color: "#FFFFFF70", fontSize: 11 }}>3:24</text>
              </div>
            </div>
          </div>

          <div style={{ ...glass, padding: 18, gap: 7 }}>
            <text style={{ color: muted, fontSize: 12, fontWeight: 600 }}>INTENTION</text>
            <text style={{ color: "#FFFFFFE8", fontSize: 14, lineHeight: 21 }}>
              Make one thing clear and useful.
            </text>
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [name, setName] = createSignal<string | null>(null)

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Show when={name()} fallback={<Welcome onSubmit={setName} />}>
        {(currentName) => <Main name={currentName()} />}
      </Show>
    </div>
  )
}

render(() => <App />, {
  title: "GPUIX Blurred Window",
  appName: "GPUIX Blurred Window",
  width: 760,
  height: 510,
  minWidth: 640,
  minHeight: 440,
  titlebarTransparent: true,
  windowBackground: "blurred",
  trafficLightX: 18,
  trafficLightY: 18,
  focus: process.env.GPUIX_BACKGROUND !== "1",
})

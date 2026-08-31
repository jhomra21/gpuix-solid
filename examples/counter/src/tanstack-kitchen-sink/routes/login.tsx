import { Show, createSignal } from "solid-js"
import type { EventPayload } from "gpuix-solid"
import { StatusBadge, blueButtonStyle, nativeInputStyle, palette } from "../native"

export function LoginRoute() {
  const [username, setUsername] = createSignal("")
  const [signedIn, setSignedIn] = createSignal(false)

  return (
    <div testId="page-login" style={{ padding: 8, gap: 8, maxWidth: 420 }}>
      <Show when={signedIn()} fallback={
        <>
          <text style={{ color: palette.text, fontSize: 13 }}>You must log in!</text>
          <input testId="login-email" value={username()} placeholder="Username" onChange={(event: EventPayload) => setUsername(event.value ?? "")} style={nativeInputStyle({ width: "100%" })} />
          <div testId="login-submit" onClick={() => { if (username().trim()) setSignedIn(true) }} style={{ ...blueButtonStyle(!username().trim()), alignSelf: "flex-start" }}>
            <text style={{ color: palette.white, fontSize: 11, fontWeight: 800 }}>LOGIN</text>
          </div>
        </>
      }>
        <text style={{ color: palette.text, fontSize: 13 }}>Logged in as</text>
        <text style={{ color: palette.text, fontSize: 13, fontWeight: 800 }}>{username()}</text>
        <StatusBadge text="Logged in" tone="success" />
        <div onClick={() => setSignedIn(false)} style={{ ...blueButtonStyle(false), alignSelf: "flex-start" }}>
          <text style={{ color: palette.white, fontSize: 11, fontWeight: 800 }}>LOG OUT</text>
        </div>
      </Show>
    </div>
  )
}

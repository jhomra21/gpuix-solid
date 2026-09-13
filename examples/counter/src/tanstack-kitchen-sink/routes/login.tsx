import { Show, createSignal } from "solid-js"
import type { EventPayload } from "gpuix-solid"
import { blueButtonStyle, nativeInputStyle, palette } from "../native"

export function LoginRoute(props: {
  username: string | null
  onLogin(username: string): void
  onLogout(): void
}) {
  const [username, setUsername] = createSignal("")

  const login = (): void => {
    const value = username().trim()
    if (value) props.onLogin(value)
  }

  return (
    <div testId="page-login" style={{ padding: 8, gap: 8, maxWidth: 420 }}>
      <Show when={props.username} fallback={
        <>
          <text style={{ color: palette.text, fontSize: 13 }}>You must log in!</text>
          <div style={{ height: 8 }} />
          <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
            <input
              testId="login-email"
              value={username()}
              placeholder="Username"
              onChange={(event: EventPayload) => setUsername(event.value ?? "")}
              onSubmit={login}
              style={nativeInputStyle({ width: 220 })}
            />
            <div testId="login-submit" onClick={login} style={{ ...blueButtonStyle(false), alignSelf: "flex-start" }}>
              <text style={{ color: palette.white, fontSize: 11 }}>Login</text>
            </div>
          </div>
        </>
      }>
        {(activeUsername) => (
          <>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
              <text style={{ color: palette.text, fontSize: 13 }}>Logged in as </text>
              <text testId="login-username" style={{ color: palette.text, fontSize: 13, fontWeight: 800 }}>{activeUsername()}</text>
            </div>
            <div style={{ height: 8 }} />
            <div testId="login-logout" onClick={props.onLogout} style={{ ...blueButtonStyle(false), alignSelf: "flex-start" }}>
              <text style={{ color: palette.white, fontSize: 11 }}>Log out</text>
            </div>
            <div style={{ height: 8 }} />
          </>
        )}
      </Show>
    </div>
  )
}

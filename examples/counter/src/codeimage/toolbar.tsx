import { For, Show, createSignal } from "solid-js"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "gpuix-solid"
import codeImageLogo from "../../upstream/codeimage/apps/codeimage/public/assets/codeimage-logo-blue-svg-v1.svg?raw"
import { ExportButton, ShareButton } from "./compat"

type DialogKind = "settings" | "changelog" | null
type ThemeMode = "dark" | "light" | "system"

const colors = {
  panel: "#111111",
  input: "#232323",
  divider: "#252525",
  button: "#333333",
  buttonHover: "#3e3e3e",
  buttonActive: "#505050",
  text: "#ededed",
  textAlt: "#cccccc",
  description: "#999999",
  primary: "#0099ff",
  white: "#ffffff",
} as const

function controlStyle(active = false) {
  return {
    minHeight: 28,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: active ? colors.primary : colors.divider,
    backgroundColor: active ? "#003d66" : colors.input,
    cursor: "pointer",
    hover: { backgroundColor: colors.buttonHover },
    active: { backgroundColor: colors.buttonActive },
  } as const
}

function ToolbarDialog(props: {
  kind: Exclude<DialogKind, null>
  themeMode: ThemeMode
  locale: string
  onThemeMode(mode: ThemeMode): void
  onLocale(locale: string): void
  onClose(): void
}) {
  return (
    <div
      style={{
        width: props.kind === "settings" ? 520 : 560,
        maxHeight: 620,
        overflowY: "scroll",
        display: "flex",
        flexDirection: "column",
        padding: 16,
        gap: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.divider,
        backgroundColor: colors.panel,
        boxShadow: { offsetX: 0, offsetY: 14, blurRadius: 30, spreadRadius: 0, color: "#00000088" },
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <text style={{ color: colors.white, fontSize: 16, fontWeight: 700 }}>
          {props.kind === "settings" ? "Settings" : "🎉 What's new"}
        </text>
        <div testId={`toolbar-${props.kind}-close`} style={{ ...controlStyle(false), width: 30, paddingLeft: 0, paddingRight: 0, justifyContent: "center" }} onClick={props.onClose}>
          <text style={{ color: colors.text, fontSize: 13, pointerEvents: "none" }}>×</text>
        </div>
      </div>

      <Show when={props.kind === "settings"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <text style={{ color: colors.textAlt, fontSize: 12, fontWeight: 600 }}>Theme</text>
          <div style={{ display: "flex", gap: 8 }}>
            <For each={["dark", "light", "system"] as const}>
              {(mode) => (
                <div testId={`toolbar-theme-${mode}`} style={controlStyle(props.themeMode === mode)} onClick={() => props.onThemeMode(mode)}>
                  <text style={{ color: colors.text, fontSize: 11, pointerEvents: "none" }}>
                    {mode === "dark" ? "Dark mode" : mode === "light" ? "Light mode" : "System"}
                  </text>
                </div>
              )}
            </For>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <text style={{ color: colors.textAlt, fontSize: 12, fontWeight: 600 }}>Locale</text>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <For each={["English", "Italiano"] as const}>
              {(locale) => (
                <div testId={`toolbar-locale-${locale.toLowerCase()}`} style={controlStyle(props.locale === locale)} onClick={() => props.onLocale(locale)}>
                  <text style={{ color: colors.text, fontSize: 11, pointerEvents: "none" }}>{locale}</text>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      <Show when={props.kind === "changelog"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <For each={[
            ["v1.9.0", "02/02/2025"],
            ["v1.8.4", "12/23/2024"],
            ["v1.7.0", "06/29/2024"],
            ["v1.6.0", "04/27/2024"],
          ] as const}>
            {(entry) => (
              <div style={{ display: "flex", justifyContent: "space-between", padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.input }}>
                <text style={{ color: colors.text, fontSize: 12, fontWeight: 600 }}>{entry[0]}</text>
                <text style={{ color: colors.description, fontSize: 10 }}>{entry[1]}</text>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}

export function Toolbar(_props: { canvasRef?: unknown }) {
  const [menuOpen, setMenuOpen] = createSignal(false)
  const [dialog, setDialog] = createSignal<DialogKind>(null)
  const [userMenuOpen, setUserMenuOpen] = createSignal(false)
  const [signedIn, setSignedIn] = createSignal(true)
  const [themeMode, setThemeMode] = createSignal<ThemeMode>("dark")
  const [locale, setLocale] = createSignal("English")
  const [navigationStatus, setNavigationStatus] = createSignal("")

  const openDialog = (kind: Exclude<DialogKind, null>): void => {
    setMenuOpen(false)
    setUserMenuOpen(false)
    setDialog(kind)
  }

  const logout = (): void => {
    setMenuOpen(false)
    setUserMenuOpen(false)
    setSignedIn(false)
    setNavigationStatus("Signed out locally")
  }

  return (
    <div
      testId="codeimage-toolbar"
      style={{
        position: "relative",
        height: 52,
        width: "100%",
        display: "flex",
        alignItems: "center",
        paddingLeft: 16,
        paddingRight: 16,
        backgroundColor: colors.panel,
        color: colors.white,
        flexShrink: 0,
      }}
    >
      <Select open={menuOpen()} onOpenChange={setMenuOpen} style={{ flexShrink: 0 }}>
        <SelectTrigger
          testId="toolbar-settings"
          aria-label="Menu"
          style={{ ...controlStyle(menuOpen()), width: 30, paddingLeft: 0, paddingRight: 0, alignItems: "center", justifyContent: "center", borderRadius: 999 }}
          onClick={() => {
            setDialog(null)
            setUserMenuOpen(false)
          }}
        >
          <text style={{ color: colors.text, fontSize: 14, pointerEvents: "none" }}>⋮</text>
        </SelectTrigger>
        <SelectContent
          testId="toolbar-menu-content"
          side="bottom"
          align="start"
          sideOffset={4}
          style={{
            width: 180,
            padding: 6,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.divider,
            backgroundColor: colors.input,
          }}
        >
          <SelectItem value="settings" testId="toolbar-menu-settings" style={controlStyle(false)} onClick={() => openDialog("settings")}>
            <text style={{ color: colors.text, fontSize: 12, pointerEvents: "none" }}>Settings</text>
          </SelectItem>
          <SelectItem value="changelog" testId="toolbar-menu-changelog" style={controlStyle(false)} onClick={() => openDialog("changelog")}>
            <text style={{ color: colors.text, fontSize: 12, pointerEvents: "none" }}>Changelog</text>
          </SelectItem>
          <SelectItem
            value="github"
            testId="toolbar-menu-github"
            style={controlStyle(false)}
            onClick={() => {
              setMenuOpen(false)
              setNavigationStatus("GitHub external link selected")
            }}
          >
            <text style={{ color: colors.text, fontSize: 12, pointerEvents: "none" }}>GitHub ↗</text>
          </SelectItem>
          <Show when={signedIn()}>
            <SelectItem value="logout" testId="toolbar-menu-logout" style={controlStyle(false)} onClick={logout}>
              <text style={{ color: colors.text, fontSize: 12, pointerEvents: "none" }}>Logout</text>
            </SelectItem>
          </Show>
        </SelectContent>
      </Select>

      <div testId="codeimage-logo" style={{ display: "flex", alignItems: "center", marginLeft: 20, width: 134, height: 26, pointerEvents: "none" }}>
        <svg source={codeImageLogo} style={{ width: 134, height: 26, flexShrink: 0 }} />
      </div>

      <Show when={signedIn()}>
        <div
          testId="dashboard-link"
          style={{ ...controlStyle(false), marginLeft: 16 }}
          onClick={() => {
            setMenuOpen(false)
            setUserMenuOpen(false)
            setNavigationStatus("Dashboard navigation selected")
          }}
        >
          <text style={{ color: colors.text, fontSize: 10, pointerEvents: "none" }}>▦ Dashboard</text>
        </div>
      </Show>

      <div style={{ flexGrow: 1 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ShareButton showLabel={false} />
        <ExportButton />
        <Show
          when={signedIn()}
          fallback={
            <div
              testId="github-sign-in"
              style={controlStyle(false)}
              onClick={() => {
                setSignedIn(true)
                setNavigationStatus("Signed in locally")
              }}
            >
              <text style={{ color: colors.text, fontSize: 10, pointerEvents: "none" }}>Sign in with GitHub</text>
            </div>
          }
        >
          <Select open={userMenuOpen()} onOpenChange={setUserMenuOpen} style={{ flexShrink: 0 }}>
            <SelectTrigger
              testId="user-badge"
              style={{ minWidth: 34, height: 30, paddingLeft: 8, paddingRight: 8, borderRadius: 15, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: colors.button, cursor: "pointer" }}
              onClick={() => {
                setMenuOpen(false)
                setDialog(null)
              }}
            >
              <text style={{ color: colors.text, fontSize: 10, fontWeight: 700, pointerEvents: "none" }}>JM</text>
            </SelectTrigger>
            <SelectContent
              testId="user-badge-menu"
              side="bottom"
              align="end"
              sideOffset={4}
              style={{ width: 140, padding: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.input }}
            >
              <SelectItem value="logout" testId="user-badge-logout" style={controlStyle(false)} onClick={logout}>
                <text style={{ color: colors.text, fontSize: 12, pointerEvents: "none" }}>Logout</text>
              </SelectItem>
            </SelectContent>
          </Select>
        </Show>
      </div>

      <Show when={dialog()} keyed>
        {(kind) => (
          <Select
            open={true}
            onOpenChange={(open) => {
              if (!open) setDialog(null)
            }}
            style={{ position: "absolute", left: 190, top: 46, width: 1, height: 1 }}
          >
            <SelectTrigger style={{ width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />
            <SelectContent
              testId={`toolbar-${kind}-dialog`}
              side="bottom"
              align="start"
              sideOffset={6}
              style={{ backgroundColor: colors.panel, borderRadius: 12 }}
            >
              <ToolbarDialog
                kind={kind}
                themeMode={themeMode()}
                locale={locale()}
                onThemeMode={setThemeMode}
                onLocale={setLocale}
                onClose={() => setDialog(null)}
              />
            </SelectContent>
          </Select>
        )}
      </Show>

      <text testId="toolbar-navigation-status" style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}>{navigationStatus()}</text>
      <text testId="toolbar-theme-mode-value" style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}>{themeMode()}</text>
      <text testId="toolbar-locale-value" style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}>{locale()}</text>
    </div>
  )
}

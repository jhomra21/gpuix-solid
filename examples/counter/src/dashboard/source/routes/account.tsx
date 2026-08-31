import { Show, createSignal, type Element as SolidElement } from "solid-js"
import type { EventPayload } from "gpuix-solid"
import { Button, Card, Divider, inputStyle, palette } from "../native"

export function AccountRoute(): SolidElement {
  const [name, setName] = createSignal("User")
  const [savedName, setSavedName] = createSignal("User")
  const [showDeleteDialog, setShowDeleteDialog] = createSignal(false)
  const [deletePassword, setDeletePassword] = createSignal("")
  const [deleteConfirmation, setDeleteConfirmation] = createSignal("")
  const [deleted, setDeleted] = createSignal(false)

  return (
    <div testId="page-account" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <text style={{ color: palette.text, fontSize: 28, fontWeight: 700 }}>Account Settings</text>
        <text style={{ color: palette.secondary, fontSize: 12 }}>Manage your account, preferences, and data.</text>
      </div>

      <Card>
        <text style={{ color: palette.text, fontSize: 16, fontWeight: 600 }}>Profile Information</text>
        <Divider />
        <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <text style={{ color: palette.text, fontSize: 13, fontWeight: 500 }}>Your Name</text>
            <text style={{ color: palette.secondary, fontSize: 11 }}>This will be displayed on your profile.</text>
          </div>
          <input testId="account-name" value={name()} placeholder="Your name" onChange={(event: EventPayload) => setName(event.value ?? "")} style={inputStyle({ width: 280 })} />
        </div>
        <Divider />
        <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <text style={{ color: palette.text, fontSize: 13, fontWeight: 500 }}>Email Address</text>
            <text style={{ color: palette.secondary, fontSize: 11 }}>Your email address cannot be changed.</text>
          </div>
          <input value="user@example.com" disabled style={inputStyle({ width: 280, opacity: 0.6 })} />
        </div>
        <Divider />
        <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <text style={{ color: palette.text, fontSize: 13, fontWeight: 500 }}>Avatar</text>
            <text style={{ color: palette.secondary, fontSize: 11 }}>This is your profile picture.</text>
          </div>
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10 }}>
            <div style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: palette.muted, alignItems: "center", justifyContent: "center" }}><text style={{ color: palette.text, fontSize: 18 }}>U</text></div>
            <Button><text style={{ color: palette.secondary, fontSize: 11 }}>Change (soon)</text></Button>
          </div>
        </div>
        <Divider />
        <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <text style={{ color: palette.secondary, fontSize: 11 }}>Joined on June 1, 2025</text>
          <Button testId="account-save" active={name() !== savedName()} onClick={() => setSavedName(name())}>
            <text style={{ color: name() !== savedName() ? palette.white : palette.text, fontSize: 12 }}>Save Changes</text>
          </Button>
        </div>
      </Card>

      <Card style={{ borderColor: "#fecaca" }}>
        <text style={{ color: palette.destructive, fontSize: 16, fontWeight: 600 }}>Danger Zone</text>
        <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 16, padding: 12, backgroundColor: "#fef2f2", borderRadius: 6 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, flexGrow: 1 }}>
            <text style={{ color: palette.destructive, fontSize: 13, fontWeight: 500 }}>Delete Account</text>
            <text style={{ color: palette.secondary, fontSize: 11 }}>Permanently delete your account and all associated data. This action cannot be undone.</text>
          </div>
          <Button testId="account-delete-open" onClick={() => setShowDeleteDialog(true)}><text style={{ color: palette.destructive, fontSize: 11 }}>Delete Account</text></Button>
        </div>
      </Card>

      <Show when={showDeleteDialog()}>
        <Card style={{ backgroundColor: palette.muted }}>
          <text style={{ color: palette.destructive, fontSize: 16, fontWeight: 600 }}>Delete Account</text>
          <text style={{ color: palette.secondary, fontSize: 12, lineHeight: 18 }}>This action cannot be undone. This will permanently delete your account and remove all your data from our servers.</text>
          <text style={{ color: palette.text, fontSize: 12, fontWeight: 500 }}>Password</text>
          <input testId="delete-password" value={deletePassword()} placeholder="Enter your password" onChange={(event: EventPayload) => setDeletePassword(event.value ?? "")} style={inputStyle({ width: "100%" })} />
          <text style={{ color: palette.text, fontSize: 12, fontWeight: 500 }}>Type DELETE to confirm</text>
          <input testId="delete-confirmation" value={deleteConfirmation()} placeholder="DELETE" onChange={(event: EventPayload) => setDeleteConfirmation(event.value ?? "")} style={inputStyle({ width: "100%" })} />
          <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
            <Button onClick={() => setShowDeleteDialog(false)}><text style={{ color: palette.text, fontSize: 12 }}>Cancel</text></Button>
            <Button testId="account-delete-confirm" active={deleteConfirmation() === "DELETE"} onClick={() => { if (deleteConfirmation() === "DELETE") { setDeleted(true); setShowDeleteDialog(false) } }}><text style={{ color: deleteConfirmation() === "DELETE" ? palette.white : palette.destructive, fontSize: 12 }}>Delete Account</text></Button>
          </div>
        </Card>
      </Show>

      <Show when={deleted()}><text testId="account-deleted" style={{ color: palette.destructive, fontSize: 12 }}>Account deleted successfully</text></Show>
    </div>
  )
}

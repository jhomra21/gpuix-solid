import { For, Show, createMemo, createSignal } from "solid-js"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type EventPayload,
} from "gpuix-solid"
import { Divider, isUsersSortBy, nativeInputStyle, palette, users, type UsersSortBy } from "../native"
import { UsersIndexRoute } from "./dashboard.users.index"
import { UserRoute } from "./dashboard.users.user"

export function UsersRoute() {
  const [sortBy, setSortBy] = createSignal<UsersSortBy>("name")
  const [filterBy, setFilterBy] = createSignal("")
  const [selectedId, setSelectedId] = createSignal<number | null>(null)

  const filteredUsers = createMemo(() => {
    const key = sortBy()
    const ordered = [...users].sort((a, b) => key === "id" ? a.id - b.id : a[key].localeCompare(b[key]))
    const filter = filterBy().trim().toLowerCase()
    return filter ? ordered.filter((user) => user.name.toLowerCase().includes(filter)) : ordered
  })
  const selected = createMemo(() => users.find((user) => user.id === selectedId()))

  const changeSort = (value: string) => {
    if (isUsersSortBy(value)) setSortBy(value)
  }

  return (
    <div testId="users-workspace" style={{ flexGrow: 1, minHeight: 0, display: "flex", flexDirection: "row" }}>
      <div style={{ width: 310, flexShrink: 0, overflowY: "scroll" }}>
        <div style={{ width: "100%", display: "flex", flexDirection: "row", gap: 8, alignItems: "center", paddingTop: 8, paddingBottom: 8, paddingLeft: 12, paddingRight: 12, backgroundColor: palette.panelSoft }}>
          <text style={{ color: palette.text, fontSize: 11 }}>Sort By:</text>
          <Select value={sortBy()} onValueChange={changeSort} style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 }}>
            <SelectTrigger testId="users-sort" style={nativeInputStyle({ width: "100%", flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, minHeight: 32, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 8, paddingRight: 8 })}>
              <SelectValue style={{ flexGrow: 1, minWidth: 0 }}>
                <text testId="users-sort-value" style={{ color: palette.text, fontSize: 12 }}>{sortBy()}</text>
              </SelectValue>
              <text style={{ color: palette.muted, fontSize: 10 }}>▾</text>
            </SelectTrigger>
            <SelectContent side="bottom" sideOffset={2} align="start" style={{ width: 180, padding: 4, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.border, borderRadius: 4 }}>
              <SelectItem testId="users-sort-item-name" value="name" textValue="name" style={{ padding: 7, color: palette.text, hover: { backgroundColor: palette.panelSoft } }}>name</SelectItem>
              <SelectItem testId="users-sort-item-id" value="id" textValue="id" style={{ padding: 7, color: palette.text, hover: { backgroundColor: palette.panelSoft } }}>id</SelectItem>
              <SelectItem testId="users-sort-item-email" value="email" textValue="email" style={{ padding: 7, color: palette.text, hover: { backgroundColor: palette.panelSoft } }}>email</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Divider />
        <div style={{ width: "100%", display: "flex", flexDirection: "row", gap: 8, alignItems: "center", paddingTop: 8, paddingBottom: 8, paddingLeft: 12, paddingRight: 12, backgroundColor: palette.panelSoft }}>
          <text style={{ color: palette.text, fontSize: 11 }}>Filter By:</text>
          <input testId="users-filter" value={filterBy()} placeholder="Search Names..." onChange={(event: EventPayload) => setFilterBy(event.value ?? "")} style={nativeInputStyle({ flexGrow: 1, minWidth: 0, minHeight: 32, paddingLeft: 8, paddingRight: 8 })} />
        </div>
        <Divider />
        <For each={filteredUsers()}>
          {(user) => (
            <>
              <div testId={`user-row-${user.id}`} onClick={() => setSelectedId(user.id)} style={{ minHeight: 38, paddingLeft: 12, paddingRight: 8, justifyContent: "center", backgroundColor: palette.app, cursor: "pointer", hover: { backgroundColor: palette.panelHover } }}>
                <text style={{ color: palette.blue, fontSize: 11, fontWeight: selectedId() === user.id ? 800 : 500 }}>{user.name}</text>
              </div>
              <Divider />
            </>
          )}
        </For>
      </div>
      <div style={{ width: 1, backgroundColor: palette.border, flexShrink: 0 }} />
      <div style={{ flexGrow: 1, minWidth: 0, padding: 8, overflowY: "scroll" }}>
        <Show when={selected()} fallback={<UsersIndexRoute />}>
          {(user) => <UserRoute user={user()} />}
        </Show>
      </div>
    </div>
  )
}

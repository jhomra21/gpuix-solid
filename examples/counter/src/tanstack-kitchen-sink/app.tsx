import {
  For,
  Match,
  Show,
  Switch,
  createMemo,
  createSignal,
} from "solid-js"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  animate,
  type EventPayload,
  type StyleDesc,
} from "@jhomra21/gpuix-solid"

type RootPage = "home" | "dashboard" | "expensive" | "route-a" | "route-b" | "profile" | "login"
type DashboardTab = "summary" | "invoices" | "users"
type UsersSortBy = "name" | "id" | "email"

interface Invoice {
  id: number
  title: string
  body: string
}

interface User {
  id: number
  name: string
  username: string
  email: string
  phone: string
  website: string
  company: string
  city: string
}

interface RootNavItem {
  page: RootPage
  label: string
}

interface InvoiceFieldsProps {
  title: string
  body: string
  titleTestId: string
  bodyTestId: string
  onTitle: (value: string) => void
  onBody: (value: string) => void
}

interface SimpleRoutePageProps {
  testId: string
  title: string
  body: string
}

const palette = {
  app: "#ffffff",
  panelSoft: "#f3f4f6",
  panelHover: "#f9fafb",
  border: "#d1d5db",
  borderSoft: "#e5e7eb",
  text: "#111827",
  muted: "#6b7280",
  faint: "#9ca3af",
  blue: "#1d4ed8",
  blueButton: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  white: "#ffffff",
}

const rootNav: RootNavItem[] = [
  { page: "home", label: "Home" },
  { page: "dashboard", label: "Dashboard" },
  { page: "expensive", label: "Expensive" },
  { page: "route-a", label: "Pathless Layout A" },
  { page: "route-b", label: "Pathless Layout B" },
  { page: "profile", label: "Profile" },
  { page: "login", label: "Login" },
]

const dashboardTabs: Array<readonly [DashboardTab, string]> = [
  ["summary", "Summary"],
  ["invoices", "Invoices"],
  ["users", "Users"],
]

const initialInvoices: Invoice[] = [
  { id: 1, title: "sunt aut facere repellat provident occaecati excepturi optio reprehenderit", body: "quia et suscipit suscipit recusandae consequuntur expedita et cum reprehenderit molestiae ut ut quas totam nostrum rerum est autem sunt rem eveniet architecto" },
  { id: 2, title: "qui est esse", body: "est rerum tempore vitae sequi sint nihil reprehenderit dolor beatae ea dolores neque fugiat blanditiis voluptate porro vel nihil molestiae ut reiciendis" },
  { id: 3, title: "ea molestias quasi exercitationem repellat qui ipsa sit aut", body: "et iusto sed quo iure voluptatem occaecati omnis eligendi aut ad voluptatem doloribus vel accusantium quis pariatur molestiae porro eius odio et labore" },
  { id: 4, title: "eum et est occaecati", body: "ullam et saepe reiciendis voluptatem adipisci sit amet autem assumenda provident rerum culpa quis hic commodi nesciunt rem tenetur doloremque ipsam iure" },
  { id: 5, title: "nesciunt quas odio", body: "repudiandae veniam quaerat sunt sed alias aut fugiat sit autem sed est voluptatem omnis possimus esse voluptatibus quis est aut tenetur dolor neque" },
  { id: 6, title: "dolorem eum magni eos aperiam quia", body: "ut aspernatur corporis harum nihil quis provident sequi mollitia nobis aliquid molestiae perspiciatis et ea nemo ab reprehenderit accusantium quas" },
  { id: 7, title: "magnam facilis autem", body: "dolore placeat quibusdam ea quo vitae magni quis enim qui quis quo nemo aut saepe quidem repellat excepturi ut quia sunt ut sequi eos ea sed quas" },
  { id: 8, title: "dolorem dolore est ipsam", body: "dignissimos aperiam dolorem qui eum facilis quibusdam animi sint suscipit qui sint possimus cum quaerat magni maiores excepturi ipsam ut commodi" },
  { id: 9, title: "nesciunt iure omnis dolorem tempora et accusantium", body: "consectetur animi nesciunt iure dolore enim quia ad veniam autem ut quam aut nobis et est aut quod aut provident voluptas autem voluptas" },
  { id: 10, title: "optio molestias id quia eum", body: "quo et expedita modi cum officia vel magni doloribus qui repudiandae vero nisi sit quos veniam quod sed accusamus veritatis error" },
]

const users: User[] = [
  { id: 1, name: "Leanne Graham", username: "Bret", email: "Sincere@april.biz", phone: "1-770-736-8031 x56442", website: "hildegard.org", company: "Romaguera-Crona", city: "Gwenborough" },
  { id: 2, name: "Ervin Howell", username: "Antonette", email: "Shanna@melissa.tv", phone: "010-692-6593 x09125", website: "anastasia.net", company: "Deckow-Crist", city: "Wisokyburgh" },
  { id: 3, name: "Clementine Bauch", username: "Samantha", email: "Nathan@yesenia.net", phone: "1-463-123-4447", website: "ramiro.info", company: "Romaguera-Jacobson", city: "McKenziehaven" },
  { id: 4, name: "Patricia Lebsack", username: "Karianne", email: "Julianne.OConner@kory.org", phone: "493-170-9623 x156", website: "kale.biz", company: "Robel-Corkery", city: "South Elvis" },
  { id: 5, name: "Chelsey Dietrich", username: "Kamren", email: "Lucio_Hettinger@annie.ca", phone: "(254)954-1289", website: "demarco.info", company: "Keebler LLC", city: "Roscoeview" },
  { id: 6, name: "Mrs. Dennis Schulist", username: "Leopoldo_Corkery", email: "Karley_Dach@jasper.info", phone: "1-477-935-8478 x6430", website: "ola.org", company: "Considine-Lockman", city: "South Christy" },
  { id: 7, name: "Kurtis Weissnat", username: "Elwyn.Skiles", email: "Telly.Hoeger@billy.biz", phone: "210.067.6132", website: "elvis.io", company: "Johns Group", city: "Howemouth" },
  { id: 8, name: "Nicholas Runolfsdottir V", username: "Maxime_Nienow", email: "Sherwood@rosamond.me", phone: "586.493.6943 x140", website: "jacynthe.com", company: "Abernathy Group", city: "Aliyaview" },
  { id: 9, name: "Glenna Reichert", username: "Delphine", email: "Chaim_McDermott@dana.io", phone: "(775)976-6794 x41206", website: "conrad.com", company: "Yost and Sons", city: "Bartholomebury" },
  { id: 10, name: "Clementina DuBuque", username: "Moriah.Stanton", email: "Rey.Padberg@karina.biz", phone: "024-648-3804", website: "ambrose.net", company: "Hoeger LLC", city: "Lebsackbury" },
]

function nativeInputStyle(extra: StyleDesc = {}): StyleDesc {
  return {
    minHeight: 38,
    paddingLeft: 10,
    paddingRight: 10,
    backgroundColor: palette.white,
    color: palette.text,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 4,
    fontSize: 12,
    ...extra,
  }
}

function blueButtonStyle(disabled = false): StyleDesc {
  const style: StyleDesc = {
    minHeight: 36,
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 4,
    backgroundColor: palette.blueButton,
    color: palette.white,
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? "default" : "pointer",
    fontWeight: 800,
  }
  if (!disabled) style.active = { opacity: 0.8 }
  return style
}

function isUsersSortBy(value: string): value is UsersSortBy {
  return value === "name" || value === "id" || value === "email"
}

function Divider() {
  return <div style={{ height: 1, backgroundColor: palette.borderSoft, flexShrink: 0 }} />
}

function StatusBadge(props: { text: string; tone: "success" | "failure" }) {
  return (
    <animate.div
      initial={{ opacity: 0, top: -5 }}
      to={{ opacity: 1, top: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{ position: "relative", alignSelf: "flex-start", paddingTop: 6, paddingBottom: 6, paddingLeft: 9, paddingRight: 9, borderRadius: 4, backgroundColor: props.tone === "success" ? palette.green : palette.red }}
    >
      <text style={{ color: palette.white, fontSize: 11, fontWeight: 700 }}>{props.text}</text>
    </animate.div>
  )
}

function HomePage(props: { onInvoice: () => void }) {
  return (
    <div testId="page-home" style={{ padding: 10, gap: 10, maxWidth: 620 }}>
      <text style={{ color: palette.text, fontSize: 18 }}>Welcome Home!</text>
      <Divider />
      <div testId="home-new-invoice" onClick={props.onInvoice} style={{ alignSelf: "flex-start", paddingTop: 5, paddingBottom: 5, paddingLeft: 9, paddingRight: 9, borderRadius: 999, backgroundColor: palette.blueButton, cursor: "pointer" }}>
        <text style={{ color: palette.white, fontSize: 11 }}>1 New Invoice</text>
      </div>
      <Divider />
      <text style={{ color: palette.text, fontSize: 12, lineHeight: 18 }}>As you navigate around take note of the UX. It should feel suspense-like, where routes are only rendered once all of their data and elements are ready.</text>
      <Divider />
      <text style={{ color: palette.text, fontSize: 12, lineHeight: 18 }}>To exaggerate async effects, the browser kitchen sink exposes an artificial request delay control. This native adaptation keeps route state deterministic and local so it can run without a network.</text>
      <Divider />
      <text style={{ color: palette.text, fontSize: 12, lineHeight: 18 }}>Link-hover preloading and route-cache controls are browser-router concerns; the dashboard, invoice, user, form, search, sort, and mutation-shaped UI below renders directly through GPUI.</text>
    </div>
  )
}

function InvoiceFields(props: InvoiceFieldsProps) {
  return (
    <div style={{ gap: 8 }}>
      <input testId={props.titleTestId} value={props.title} placeholder="Invoice Title" onChange={(event: EventPayload) => props.onTitle(event.value ?? "")} style={nativeInputStyle({ width: "100%", fontSize: 14, fontWeight: 700 })} />
      <textarea testId={props.bodyTestId} value={props.body} placeholder="Invoice Body..." minRows={5} maxRows={8} onChange={(event: EventPayload) => props.onBody(event.value ?? "")} style={nativeInputStyle({ width: "100%", minHeight: 130, paddingTop: 9, paddingBottom: 9, lineHeight: 17 })} />
    </div>
  )
}

function InvoiceWorkspace() {
  const [invoices, setInvoices] = createSignal<Invoice[]>(initialInvoices)
  const [selectedId, setSelectedId] = createSignal<number | null>(3)
  const [creating, setCreating] = createSignal(false)
  const [newTitle, setNewTitle] = createSignal("")
  const [newBody, setNewBody] = createSignal("")
  const [created, setCreated] = createSignal(false)
  const [editTitle, setEditTitle] = createSignal(initialInvoices[2]?.title ?? "")
  const [editBody, setEditBody] = createSignal(initialInvoices[2]?.body ?? "")
  const [notesOpen, setNotesOpen] = createSignal(false)
  const [notes, setNotes] = createSignal("")
  const [saved, setSaved] = createSignal(false)

  const selected = createMemo(() => invoices().find((invoice) => invoice.id === selectedId()))

  const chooseInvoice = (invoice: Invoice) => {
    setCreating(false)
    setCreated(false)
    setSaved(false)
    setSelectedId(invoice.id)
    setEditTitle(invoice.title)
    setEditBody(invoice.body)
  }

  const beginCreate = () => {
    setSelectedId(null)
    setCreating(true)
    setCreated(false)
    setNewTitle("")
    setNewBody("")
  }

  const createInvoice = () => {
    const title = newTitle().trim()
    if (!title) return
    const nextId = invoices().reduce((max, invoice) => Math.max(max, invoice.id), 0) + 1
    setInvoices((current) => [...current, { id: nextId, title, body: newBody().trim() || "New invoice body" }])
    setNewTitle("")
    setNewBody("")
    setCreated(true)
  }

  const saveInvoice = () => {
    const id = selectedId()
    if (id === null) return
    setInvoices((current) => current.map((invoice) => invoice.id === id ? { ...invoice, title: editTitle(), body: editBody() } : invoice))
    setSaved(true)
  }

  return (
    <div testId="invoice-workspace" style={{ flexGrow: 1, minHeight: 0, display: "flex" }}>
      <div style={{ width: 210, flexShrink: 0, overflowY: "scroll" }}>
        <div style={{ padding: 8 }}><div testId="create-invoice-nav" onClick={beginCreate} style={{ ...blueButtonStyle(false), alignItems: "center" }}><text style={{ color: palette.white, fontSize: 11, fontWeight: 800 }}>Create Invoice</text></div></div>
        <Divider />
        <For each={invoices()}>
          {(invoice) => (
            <>
              <div testId={`invoice-row-${invoice.id}`} onClick={() => chooseInvoice(invoice)} style={{ minHeight: 38, paddingLeft: 12, paddingRight: 8, justifyContent: "center", backgroundColor: selectedId() === invoice.id && !creating() ? palette.panelSoft : palette.white, cursor: "pointer", hover: { backgroundColor: palette.panelHover } }}>
                <text style={{ color: palette.blue, fontSize: 11, fontWeight: selectedId() === invoice.id ? 800 : 500 }}>#{invoice.id} - {invoice.title.slice(0, 10)}</text>
              </div>
              <Divider />
            </>
          )}
        </For>
      </div>
      <div style={{ width: 1, backgroundColor: palette.border, flexShrink: 0 }} />
      <div style={{ flexGrow: 1, minWidth: 0, padding: 12, overflowY: "scroll" }}>
        <Show when={creating()}>
          <div testId="invoice-create-panel" style={{ gap: 10, maxWidth: 680 }}>
            <text style={{ color: palette.text, fontSize: 13 }}>Create a new Invoice:</text>
            <InvoiceFields title={newTitle()} body={newBody()} titleTestId="create-title" bodyTestId="create-body" onTitle={setNewTitle} onBody={setNewBody} />
            <div testId="create-invoice-submit" onClick={createInvoice} style={blueButtonStyle(!newTitle().trim())}><text style={{ color: palette.white, fontSize: 11, fontWeight: 800 }}>CREATE</text></div>
            <Show when={created()}><StatusBadge text="Created!" tone="success" /></Show>
          </div>
        </Show>
        <Show when={!creating() && selected()}>
          {(invoice) => (
            <div testId="invoice-detail-panel" style={{ gap: 10, maxWidth: 680 }}>
              <InvoiceFields title={editTitle()} body={editBody()} titleTestId="edit-title" bodyTestId="edit-body" onTitle={(value) => { setEditTitle(value); setSaved(false) }} onBody={(value) => { setEditBody(value); setSaved(false) }} />
              <div testId="toggle-invoice-notes" onClick={() => setNotesOpen((open) => !open)} style={{ alignSelf: "flex-start", cursor: "pointer" }}><text style={{ color: palette.blue, fontSize: 12 }}>{notesOpen() ? "Close Notes" : "Show Notes"}</text></div>
              <Show when={notesOpen()}>
                <textarea testId="invoice-notes" value={notes()} placeholder="Write some notes here..." minRows={4} maxRows={6} onChange={(event: EventPayload) => setNotes(event.value ?? "")} style={nativeInputStyle({ width: "100%", minHeight: 96, paddingTop: 9, paddingBottom: 9 })} />
                <text style={{ color: palette.muted, fontSize: 10 }}>Notes are stored in the URL in the upstream example. This native fixture preserves them as local route-shaped state.</text>
              </Show>
              <div testId="save-invoice" onClick={saveInvoice} style={blueButtonStyle(false)}><text style={{ color: palette.white, fontSize: 11, fontWeight: 800 }}>SAVE</text></div>
              <Show when={saved()}><StatusBadge text="Saved!" tone="success" /></Show>
              <text testId="invoice-id" style={{ color: palette.faint, fontSize: 10 }}>Invoice #{invoice().id}</text>
            </div>
          )}
        </Show>
      </div>
    </div>
  )
}

function UsersWorkspace() {
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
    <div testId="users-workspace" style={{ flexGrow: 1, minHeight: 0, display: "flex" }}>
      <div style={{ width: 310, flexShrink: 0, overflowY: "scroll" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: 10, backgroundColor: palette.panelSoft }}>
          <text style={{ color: palette.text, fontSize: 11 }}>Sort By:</text>
          <Select value={sortBy()} onValueChange={changeSort}>
            <SelectTrigger testId="users-sort" style={nativeInputStyle({ flexGrow: 1, minHeight: 32 })}><SelectValue /></SelectTrigger>
            <SelectContent style={{ padding: 5, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.border, borderRadius: 4 }}>
              <SelectItem value="name" style={{ padding: 7, color: palette.text, hover: { backgroundColor: palette.panelSoft } }}>name</SelectItem>
              <SelectItem value="id" style={{ padding: 7, color: palette.text, hover: { backgroundColor: palette.panelSoft } }}>id</SelectItem>
              <SelectItem value="email" style={{ padding: 7, color: palette.text, hover: { backgroundColor: palette.panelSoft } }}>email</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Divider />
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: 10, backgroundColor: palette.panelSoft }}>
          <text style={{ color: palette.text, fontSize: 11 }}>Filter By:</text>
          <input testId="users-filter" value={filterBy()} placeholder="Search Names..." onChange={(event: EventPayload) => setFilterBy(event.value ?? "")} style={nativeInputStyle({ flexGrow: 1, minHeight: 32 })} />
        </div>
        <Divider />
        <For each={filteredUsers()}>
          {(user) => (
            <>
              <div testId={`user-row-${user.id}`} onClick={() => setSelectedId(user.id)} style={{ minHeight: 38, paddingLeft: 12, paddingRight: 8, justifyContent: "center", backgroundColor: selectedId() === user.id ? palette.panelSoft : palette.white, cursor: "pointer", hover: { backgroundColor: palette.panelHover } }}><text style={{ color: palette.blue, fontSize: 11, fontWeight: selectedId() === user.id ? 800 : 500 }}>{user.name}</text></div>
              <Divider />
            </>
          )}
        </For>
      </div>
      <div style={{ width: 1, backgroundColor: palette.border, flexShrink: 0 }} />
      <div style={{ flexGrow: 1, minWidth: 0, padding: 12, overflowY: "scroll" }}>
        <Show when={selected()} fallback={<div testId="users-index-copy" style={{ gap: 10, maxWidth: 650 }}><text style={{ color: palette.text, fontSize: 12, lineHeight: 18 }}>Normally, setting default search parameters would either need to be done manually in every link to a page, or as a side-effect.</text><text style={{ color: palette.text, fontSize: 12, lineHeight: 18 }}>Instead, TanStack Router uses search filters to provide defaults or persist search params for links to routes and child routes.</text><text style={{ color: palette.text, fontSize: 12, lineHeight: 18 }}>A good example is the sorting and filtering of this users list. The native adaptation keeps the same reactive state while rendering it directly through GPUIX.</text></div>}>
          {(user) => (
            <div testId="user-detail" style={{ gap: 7 }}>
              <text style={{ color: palette.text, fontSize: 14, fontWeight: 800 }}>{user().name}</text>
              <text style={{ color: palette.text, fontSize: 11, fontFamily: "monospace" }}>{`{`}</text>
              <text style={{ color: palette.text, fontSize: 11, fontFamily: "monospace" }}>  "id": {user().id},</text>
              <text style={{ color: palette.text, fontSize: 11, fontFamily: "monospace" }}>  "name": "{user().name}",</text>
              <text style={{ color: palette.text, fontSize: 11, fontFamily: "monospace" }}>  "username": "{user().username}",</text>
              <text style={{ color: palette.text, fontSize: 11, fontFamily: "monospace" }}>  "email": "{user().email}",</text>
              <text style={{ color: palette.text, fontSize: 11, fontFamily: "monospace" }}>  "city": "{user().city}",</text>
              <text style={{ color: palette.text, fontSize: 11, fontFamily: "monospace" }}>  "phone": "{user().phone}",</text>
              <text style={{ color: palette.text, fontSize: 11, fontFamily: "monospace" }}>  "website": "{user().website}",</text>
              <text style={{ color: palette.text, fontSize: 11, fontFamily: "monospace" }}>  "company": "{user().company}"</text>
              <text style={{ color: palette.text, fontSize: 11, fontFamily: "monospace" }}>{`}`}</text>
            </div>
          )}
        </Show>
      </div>
    </div>
  )
}

function DashboardPage() {
  const [tab, setTab] = createSignal<DashboardTab>("summary")
  return (
    <div testId="page-dashboard" style={{ flexGrow: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ minHeight: 46, paddingLeft: 10, paddingRight: 10, justifyContent: "center" }}><text style={{ color: palette.text, fontSize: 20 }}>Dashboard</text></div>
      <Divider />
      <div style={{ minHeight: 40, display: "flex" }}>
        <For each={dashboardTabs}>{([value, label]) => <div testId={`dashboard-tab-${value}`} onClick={() => setTab(value)} style={{ minWidth: 82, paddingLeft: 12, paddingRight: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.borderSoft, backgroundColor: palette.white, cursor: "pointer" }}><text style={{ color: palette.text, fontSize: 12, fontWeight: tab() === value ? 800 : 400 }}>{label}</text></div>}</For>
      </div>
      <Divider />
      <div style={{ flexGrow: 1, minHeight: 0, display: "flex" }}>
        <Switch>
          <Match when={tab() === "summary"}><div testId="dashboard-summary" style={{ padding: 16 }}><text style={{ color: palette.text, fontSize: 12 }}>Welcome to the dashboard! You have </text><text testId="invoice-count" style={{ color: palette.text, fontSize: 12, fontWeight: 800 }}>{initialInvoices.length} total invoices.</text></div></Match>
          <Match when={tab() === "invoices"}><InvoiceWorkspace /></Match>
          <Match when={tab() === "users"}><UsersWorkspace /></Match>
        </Switch>
      </div>
    </div>
  )
}

function SimpleRoutePage(props: SimpleRoutePageProps) {
  return <div testId={props.testId} style={{ padding: 12, gap: 10, maxWidth: 620 }}><text style={{ color: palette.text, fontSize: 18, fontWeight: 700 }}>{props.title}</text><Divider /><text style={{ color: palette.text, fontSize: 12, lineHeight: 18 }}>{props.body}</text></div>
}

function LoginPage() {
  const [email, setEmail] = createSignal("")
  const [signedIn, setSignedIn] = createSignal(false)
  return <div testId="page-login" style={{ padding: 12, gap: 10, maxWidth: 420 }}><text style={{ color: palette.text, fontSize: 18, fontWeight: 700 }}>Login</text><input testId="login-email" value={email()} placeholder="Email" onChange={(event: EventPayload) => setEmail(event.value ?? "")} style={nativeInputStyle({ width: "100%" })} /><div testId="login-submit" onClick={() => { if (email().trim()) setSignedIn(true) }} style={blueButtonStyle(!email().trim())}><text style={{ color: palette.white, fontSize: 11, fontWeight: 800 }}>LOGIN</text></div><Show when={signedIn()}><StatusBadge text="Logged in" tone="success" /></Show></div>
}

export function TanStackKitchenSinkNative() {
  const [page, setPage] = createSignal<RootPage>("dashboard")
  return (
    <div testId="tanstack-kitchen-sink" style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", backgroundColor: palette.app, color: palette.text, fontFamily: "system-ui" }}>
      <div style={{ minHeight: 58, display: "flex", alignItems: "center", gap: 10, paddingLeft: 10, paddingRight: 10 }}><text style={{ color: palette.text, fontSize: 30, fontWeight: 500 }}>Kitchen Sink</text><div style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: palette.green }} /></div>
      <Divider />
      <div style={{ flexGrow: 1, minHeight: 0, display: "flex" }}>
        <div style={{ width: 224, flexShrink: 0, overflowY: "scroll" }}>
          <For each={rootNav}>{(item) => <><div testId={`root-nav-${item.page}`} onClick={() => setPage(item.page)} style={{ minHeight: 42, paddingLeft: 12, paddingRight: 10, justifyContent: "center", backgroundColor: page() === item.page ? palette.panelSoft : palette.white, cursor: "pointer", hover: { backgroundColor: palette.panelHover } }}><text style={{ color: palette.blue, fontSize: 12, fontWeight: page() === item.page ? 800 : 500 }}>{item.label}</text></div><Divider /></>}</For>
          <div style={{ flexGrow: 1 }} />
          <div style={{ padding: 10, gap: 5 }}><text style={{ color: palette.faint, fontSize: 9 }}>TanStack Router Solid 2 RC kitchen sink</text><text style={{ color: palette.faint, fontSize: 9 }}>native GPUIX adaptation</text></div>
        </div>
        <div style={{ width: 1, backgroundColor: palette.border, flexShrink: 0 }} />
        <div style={{ flexGrow: 1, minWidth: 0, minHeight: 0, display: "flex" }}>
          <Switch>
            <Match when={page() === "home"}><HomePage onInvoice={() => setPage("dashboard")} /></Match>
            <Match when={page() === "dashboard"}><DashboardPage /></Match>
            <Match when={page() === "expensive"}><SimpleRoutePage testId="page-expensive" title="Expensive" body="This route is intentionally used by the upstream kitchen sink to demonstrate deferred route loading and artificial request latency." /></Match>
            <Match when={page() === "route-a"}><SimpleRoutePage testId="page-route-a" title="Pathless Layout A" body="This view sits under the kitchen sink's pathless layout route. The native adaptation preserves the navigation hierarchy without a URL renderer." /></Match>
            <Match when={page() === "route-b"}><SimpleRoutePage testId="page-route-b" title="Pathless Layout B" body="A sibling route sharing the same pathless layout state." /></Match>
            <Match when={page() === "profile"}><SimpleRoutePage testId="page-profile" title="Profile" body="Authenticated profile content in the upstream example. The native fixture keeps authentication deterministic and local." /></Match>
            <Match when={page() === "login"}><LoginPage /></Match>
          </Switch>
        </div>
      </div>
    </div>
  )
}

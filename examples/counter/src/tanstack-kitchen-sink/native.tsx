import { animate, type EventPayload, type StyleDesc } from "gpuix-solid"

export type RootPage = "home" | "dashboard" | "expensive" | "route-a" | "route-b" | "profile" | "login"
export type DashboardTab = "summary" | "invoices" | "users"
export type UsersSortBy = "name" | "id" | "email"

export interface Invoice {
  id: number
  title: string
  body: string
}

export interface User {
  id: number
  name: string
  username: string
  email: string
  phone: string
  website: string
  company: string
  city: string
}

export const palette = {
  app: "#f9fafb",
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
} as const

export const initialInvoices: Invoice[] = [
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

export const users: User[] = [
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

export function nativeInputStyle(extra: StyleDesc = {}): StyleDesc {
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

export function blueButtonStyle(disabled = false): StyleDesc {
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

export function isUsersSortBy(value: string): value is UsersSortBy {
  return value === "name" || value === "id" || value === "email"
}

export function Divider() {
  return <div style={{ height: 1, backgroundColor: palette.borderSoft, flexShrink: 0 }} />
}

export function StatusBadge(props: { text: string; tone: "success" | "failure" }) {
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

export interface InvoiceFieldsProps {
  title: string
  body: string
  titleTestId: string
  bodyTestId: string
  onTitle(value: string): void
  onBody(value: string): void
}

export function InvoiceFields(props: InvoiceFieldsProps) {
  return (
    <div style={{ gap: 8 }}>
      <input testId={props.titleTestId} value={props.title} placeholder="Invoice Title" onChange={(event: EventPayload) => props.onTitle(event.value ?? "")} style={nativeInputStyle({ width: "100%", minHeight: 42, fontSize: 18, fontWeight: 700, paddingLeft: 8, paddingRight: 8 })} />
      <textarea testId={props.bodyTestId} value={props.body} placeholder="Invoice Body..." minRows={6} maxRows={6} onChange={(event: EventPayload) => props.onBody(event.value ?? "")} style={nativeInputStyle({ width: "100%", minHeight: 144, paddingTop: 8, paddingBottom: 8, paddingLeft: 8, paddingRight: 8, lineHeight: 18 })} />
    </div>
  )
}

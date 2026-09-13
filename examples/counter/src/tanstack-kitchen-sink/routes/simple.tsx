import { Divider, palette } from "../native"

export function ExpensiveRoute() {
  return (
    <div testId="page-expensive" style={{ padding: 8 }}>
      <text style={{ color: palette.text, fontSize: 12, lineHeight: 18 }}>
        I am an "expensive" component... which really just means that I was code-split 😉
      </text>
    </div>
  )
}

export function PathlessRoute(props: { route: "A" | "B" }) {
  return (
    <div testId={`page-route-${props.route.toLowerCase()}`} style={{ padding: 8, gap: 8 }}>
      <text style={{ color: palette.text, fontSize: 12 }}>Layout</text>
      <Divider />
      <text style={{ color: palette.text, fontSize: 12 }}>{`I'm ${props.route}!`}</text>
    </div>
  )
}

export function ProfileRoute(props: { username: string }) {
  return (
    <div testId="page-profile" style={{ padding: 8, gap: 8 }}>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
        <text style={{ color: palette.text, fontSize: 12 }}>Username:</text>
        <text testId="profile-username" style={{ color: palette.text, fontSize: 12, fontWeight: 800 }}>{props.username}</text>
      </div>
    </div>
  )
}

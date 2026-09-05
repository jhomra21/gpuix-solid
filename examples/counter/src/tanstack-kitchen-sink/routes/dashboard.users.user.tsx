import { palette, type User } from "../native"

export function UserRoute(props: { user: User }) {
  return (
    <div testId="user-detail" style={{ gap: 5 }}>
      <text style={{ color: palette.text, fontSize: 14, fontWeight: 800 }}>{props.user.name}</text>
      <text style={{ color: palette.text, fontSize: 11, fontFamily: "monospace" }}>{`{`}</text>
      <text style={{ color: palette.text, fontSize: 11, fontFamily: "monospace" }}>  "id": {props.user.id},</text>
      <text style={{ color: palette.text, fontSize: 11, fontFamily: "monospace" }}>  "name": "{props.user.name}",</text>
      <text style={{ color: palette.text, fontSize: 11, fontFamily: "monospace" }}>  "username": "{props.user.username}",</text>
      <text style={{ color: palette.text, fontSize: 11, fontFamily: "monospace" }}>  "email": "{props.user.email}",</text>
      <text style={{ color: palette.text, fontSize: 11, fontFamily: "monospace" }}>  "city": "{props.user.city}",</text>
      <text style={{ color: palette.text, fontSize: 11, fontFamily: "monospace" }}>  "phone": "{props.user.phone}",</text>
      <text style={{ color: palette.text, fontSize: 11, fontFamily: "monospace" }}>  "website": "{props.user.website}",</text>
      <text style={{ color: palette.text, fontSize: 11, fontFamily: "monospace" }}>  "company": "{props.user.company}"</text>
      <text style={{ color: palette.text, fontSize: 11, fontFamily: "monospace" }}>{`}`}</text>
    </div>
  )
}

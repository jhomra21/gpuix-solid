import { palette, type User } from "../native"

const jsonLineStyle = {
  color: palette.text,
  fontSize: 11,
  fontFamily: "monospace",
  width: "100%",
} as const

export function UserRoute(props: { user: User }) {
  return (
    <div testId="user-detail" style={{ gap: 5, width: "100%" }}>
      <text style={{ color: palette.text, fontSize: 14, fontWeight: 800 }}>{props.user.name}</text>
      <text style={jsonLineStyle}>{`{`}</text>
      <text style={jsonLineStyle}>  "id": {props.user.id},</text>
      <text style={jsonLineStyle}>  "name": "{props.user.name}",</text>
      <text style={jsonLineStyle}>  "username": "{props.user.username}",</text>
      <text testId="user-detail-email-line" style={jsonLineStyle}>  "email": "{props.user.email}",</text>
      <text style={jsonLineStyle}>  "city": "{props.user.city}",</text>
      <text style={jsonLineStyle}>  "phone": "{props.user.phone}",</text>
      <text style={jsonLineStyle}>  "website": "{props.user.website}",</text>
      <text style={jsonLineStyle}>  "company": "{props.user.company}"</text>
      <text style={jsonLineStyle}>{`}`}</text>
    </div>
  )
}

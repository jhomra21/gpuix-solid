import { Divider, palette } from "../native"

export function SimpleRoute(props: { testId: string; title: string; body: string }) {
  return (
    <div testId={props.testId} style={{ padding: 8, gap: 8, maxWidth: 620 }}>
      <text style={{ color: palette.text, fontSize: 18, fontWeight: 700 }}>{props.title}</text>
      <Divider />
      <text style={{ color: palette.text, fontSize: 12, lineHeight: 18 }}>{props.body}</text>
    </div>
  )
}

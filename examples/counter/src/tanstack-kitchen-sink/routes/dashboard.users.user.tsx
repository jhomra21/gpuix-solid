import { For } from "solid-js"
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
      <For each={JSON.stringify(props.user, null, 2).split("\n")}>
        {(line, index) => (
          <text
            testId={index() === 4 ? "user-detail-email-line" : undefined}
            style={jsonLineStyle}
          >
            {line}
          </text>
        )}
      </For>
    </div>
  )
}

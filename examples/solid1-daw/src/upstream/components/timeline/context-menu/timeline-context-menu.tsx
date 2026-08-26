import type { JSX } from "solid-js"

export type TimelineContextMenuItem =
  | { kind: "label"; label: string }
  | { kind: "separator" }
  | { kind: "item"; label: string; disabled?: boolean; onSelect?: () => void }

export default function TimelineContextMenu(props: {
  items: TimelineContextMenuItem[] | (() => TimelineContextMenuItem[])
  children: JSX.Element
}): JSX.Element {
  return <>{props.children}</>
}

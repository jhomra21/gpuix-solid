import { Divider, palette } from "../native"

export function IndexRoute(props: { onInvoice(): void }) {
  return (
    <div testId="page-home" style={{ padding: 8, gap: 8, maxWidth: 576 }}>
      <text style={{ color: palette.text, fontSize: 18 }}>Welcome Home!</text>
      <Divider />
      <div testId="home-new-invoice" onClick={props.onInvoice} style={{ alignSelf: "flex-start", paddingTop: 4, paddingBottom: 4, paddingLeft: 8, paddingRight: 8, borderRadius: 999, backgroundColor: palette.blueButton, cursor: "pointer" }}>
        <text style={{ color: palette.white, fontSize: 12 }}>1 New Invoice</text>
      </div>
      <Divider />
      <text style={{ color: palette.text, fontSize: 12, lineHeight: 18 }}>As you navigate around take note of the UX. It should feel suspense-like, where routes are only rendered once all of their data and elements are ready.</text>
      <Divider />
      <text style={{ color: palette.text, fontSize: 12, lineHeight: 18 }}>To exaggerate async effects, play with the artificial request delay slider in the bottom-left corner.</text>
      <Divider />
      <text style={{ color: palette.text, fontSize: 12, lineHeight: 18 }}>The last 2 sliders determine if link-hover preloading is enabled (and how long those preloads stick around) and also whether to cache rendered route data (and for how long). Both of these default to 0 (or off).</text>
    </div>
  )
}

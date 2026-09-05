import { palette } from "../native"

export function UsersIndexRoute() {
  return (
    <div testId="users-index-copy" style={{ gap: 10, maxWidth: 650 }}>
      <text style={{ color: palette.text, fontSize: 12, lineHeight: 18 }}>Normally, setting default search parameters would either need to be done manually in every link to a page, or as a side-effect (not a great experience).</text>
      <text style={{ color: palette.text, fontSize: 12, lineHeight: 18 }}>Instead, we can use search filters to provide defaults or even persist search params for links to routes (and child routes).</text>
      <text style={{ color: palette.text, fontSize: 12, lineHeight: 18 }}>A good example of this is the sorting and filtering of the users list. In a traditional router, both would be lost while navigating around individual users or even changing each sort/filter option unless each state was manually passed from the current route into each new link we created. With TanStack router and search filters, they are persisted with little effort.</text>
    </div>
  )
}

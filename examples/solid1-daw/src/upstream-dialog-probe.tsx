import type { JSX } from "solid-js"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./upstream/components/ui/dialog"

export function UpstreamDialogProbe(): JSX.Element {
  return (
    <div testId="upstream-dialog-probe" style={{ width: 720, height: 520, padding: 24, backgroundColor: "#101012" }}>
      <Dialog>
        <DialogTrigger testId="upstream-dialog-trigger" style={{ padding: 10, backgroundColor: "#27272a", color: "#fafafa" }}>
          <text>Open copied DAW dialog</text>
        </DialogTrigger>
        <DialogContent testId="upstream-dialog-content">
          <DialogHeader>
            <DialogTitle testId="upstream-dialog-title">Export audio</DialogTitle>
            <DialogDescription testId="upstream-dialog-description">
              This content is rendered by the copied DAW dialog wrapper.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  )
}

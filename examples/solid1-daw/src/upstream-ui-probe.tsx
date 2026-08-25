import { createSignal, type JSX } from "solid-js"
import { Avatar, AvatarFallback } from "./upstream/components/ui/avatar"
import { Button } from "./upstream/components/ui/button"
import { Separator } from "./upstream/components/ui/separator"
import {
  TextField,
  TextFieldDescription,
  TextFieldErrorMessage,
  TextFieldInput,
  TextFieldLabel,
} from "./upstream/components/ui/text-field"
import { Tooltip, TooltipContent, TooltipTrigger } from "./upstream/components/ui/tooltip"

export function UpstreamUiProbe(): JSX.Element {
  const [presses, setPresses] = createSignal(0)
  const [name, setName] = createSignal("Synth Lead")

  return (
    <div
      testId="upstream-ui-probe"
      class="flex flex-col gap-2 bg-background text-foreground p-4"
      style={{ width: 520 }}
    >
      <div class="flex items-center gap-2">
        <Button
          testId="upstream-button"
          variant="ghost"
          size="icon"
          onClick={() => setPresses((value) => value + 1)}
        >
          <svg
            testId="upstream-button-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M5 12h14M12 5v14" />
          </svg>
        </Button>
        <span testId="upstream-button-count" class="text-sm text-muted-foreground">
          {`Copied Button presses: ${presses()}`}
        </span>
      </div>

      <Separator />

      <div class="flex items-center gap-2">
        <Avatar testId="upstream-avatar">
          <AvatarFallback testId="upstream-avatar-fallback">DA</AvatarFallback>
        </Avatar>
        <span class="text-sm">Copied avatar fallback</span>
      </div>

      <TextField
        testId="upstream-text-field"
        value={name()}
        onValueChange={setName}
        validationState="invalid"
      >
        <TextFieldLabel>Track name</TextFieldLabel>
        <TextFieldInput testId="upstream-text-input" />
        <TextFieldDescription>Copied DAW TextField wrapper</TextFieldDescription>
        <TextFieldErrorMessage testId="upstream-text-error">
          Invalid route
        </TextFieldErrorMessage>
      </TextField>

      <Tooltip openDelay={0} closeDelay={0}>
        <TooltipTrigger testId="upstream-tooltip-trigger">
          <span class="text-sm">Hover copied tooltip</span>
        </TooltipTrigger>
        <TooltipContent testId="upstream-tooltip-content">
          Copied DAW tooltip content
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

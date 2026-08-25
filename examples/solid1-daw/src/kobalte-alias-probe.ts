import { ColorModeProvider, type ColorModeStorageManager } from "@kobalte/core"
import * as Button from "@kobalte/core/button"
import * as ContextMenu from "@kobalte/core/context-menu"
import * as Dialog from "@kobalte/core/dialog"
import * as DropdownMenu from "@kobalte/core/dropdown-menu"
import * as Image from "@kobalte/core/image"
import * as Menubar from "@kobalte/core/menubar"
import type { PolymorphicProps } from "@kobalte/core/polymorphic"
import * as Separator from "@kobalte/core/separator"
import * as TextField from "@kobalte/core/text-field"
import * as Tooltip from "@kobalte/core/tooltip"
import { Avatar as UpstreamAvatar } from "./upstream/components/ui/avatar"
import { Button as UpstreamButton } from "./upstream/components/ui/button"
import { Separator as UpstreamSeparator } from "./upstream/components/ui/separator"
import { TextField as UpstreamTextField } from "./upstream/components/ui/text-field"
import { Tooltip as UpstreamTooltip } from "./upstream/components/ui/tooltip"

type NativeAliasPolymorphicProbe = PolymorphicProps<"div", { label: string }>
type NativeAliasColorModeProbe = ColorModeStorageManager

export const kobalteAliasProbe = {
  ColorModeProvider,
  Button,
  ContextMenu,
  Dialog,
  DropdownMenu,
  Image,
  Menubar,
  Separator,
  TextField,
  Tooltip,
  UpstreamAvatar,
  UpstreamButton,
  UpstreamSeparator,
  UpstreamTextField,
  UpstreamTooltip,
}

export type { NativeAliasColorModeProbe, NativeAliasPolymorphicProbe }

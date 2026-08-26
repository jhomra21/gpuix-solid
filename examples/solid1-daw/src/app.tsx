import type { JSX } from "solid-js"
import "./native-style-compat"
import { kobalteAliasProbe } from "./kobalte-alias-probe"
import Timeline from "./native/Timeline"

void kobalteAliasProbe

export function DawSolid1Showcase(): JSX.Element {
  return <Timeline />
}

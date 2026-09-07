import type { JSX } from "solid-js"
import "./native-style-compat"
import "./compat/eq-visual-audio"
import { kobalteAliasProbe } from "./kobalte-alias-probe"
import Timeline from "./native/Timeline"

void kobalteAliasProbe

export function DawSolid1Showcase(): JSX.Element {
  return <Timeline />
}

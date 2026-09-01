import type { Element as SolidElement } from "solid-js"
import type { HostEventHandler, HostRef, StyleDesc } from "gpuix-solid"

interface ButtonProps {
  children?: SolidElement
  class?: string
  variant?: "default" | "secondary" | "on" | "ghost" | "link" | "destructive" | "outline"
  size?: "default" | "small" | "icon" | "icon-square" | "icon-select"
  onClick?: HostEventHandler
  ref?: HostRef
  disabled?: boolean
}

const baseStyle: StyleDesc = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 0,
  flexShrink: 0,
  borderRadius: 6,
  fontWeight: 450,
  fontSize: 12,
}

function variantStyle(variant: ButtonProps["variant"]): StyleDesc {
  if (variant === "link") {
    return {
      backgroundColor: "#00000000",
      color: "#F2F2F2A3",
      hover: { color: "#F2F2F2" },
      active: { color: "#F2F2F2" },
    }
  }
  return {}
}

function sizeStyle(size: ButtonProps["size"]): StyleDesc {
  if (size === "small") return { height: 20, paddingLeft: 4, paddingRight: 4, fontSize: 10, borderRadius: 4 }
  if (size === "icon") return { width: 24, height: 28, paddingLeft: 0, paddingRight: 0 }
  if (size === "icon-square") return { width: 28, height: 28, paddingLeft: 0, paddingRight: 0 }
  if (size === "icon-select") return { width: 16, height: 28, paddingLeft: 0, paddingRight: 0 }
  return { height: 28, paddingLeft: 8, paddingRight: 8 }
}

export function Button(props: ButtonProps): SolidElement {
  return (
    <button
      ref={props.ref}
      disabled={props.disabled}
      class={props.class}
      onClick={props.onClick}
      style={{ ...baseStyle, ...variantStyle(props.variant), ...sizeStyle(props.size) }}
    >
      {props.children}
    </button>
  )
}

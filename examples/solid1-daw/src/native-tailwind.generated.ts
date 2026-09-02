import type { NativeStyleManifest } from "@jhomra21/gpuix-solid1"

// Explicit native omissions. Each class remains registered so copied source can execute
// without silently widening the unsupported-CSS surface. Remove an omission as soon as
// the corresponding GPUIX/native contract can represent it faithfully.
// - !duration-150: native StyleDesc transitions are not published in GPUIX 0.7
// - !transition-transform: native StyleDesc transitions are not published in GPUIX 0.7
// - active:scale-97: GPUIX 0.7 has no transform/scale StyleDesc field
// - appearance-none: GPUIX native inputs do not have browser user-agent appearance chrome to suppress
// - aspect-square: the copied avatar already supplies equal native width and height through size utilities
// - border-dashed: GPUIX 0.7 exposes border width/color but not border style; native fallback remains solid
// - box-border: GPUIX 0.7 has no box-sizing StyleDesc field; native DAW footer bounds tests already verify the intended total border-box geometry
// - col-start-3: GPUIX 0.7 does not publish grid-item column placement; the native DAW verifier asserts the collapsed source control group remains right-aligned before this omission is accepted
// - col-start-4: GPUIX 0.7 does not publish grid-item column placement; the native DAW verifier asserts collapsed mute/solo/arm/volume order and right alignment
// - data-[closed]:animate-out: native Kobalte menus unmount directly without browser CSS exit animations
// - data-[closed]:fade-out-0: native Kobalte menus unmount directly without browser CSS opacity animation
// - data-[closed]:hidden: native Kobalte menus own closed-state mounting rather than CSS visibility
// - data-[closed]:zoom-out-95: native Kobalte menus do not use browser CSS scale animations
// - data-[disabled]:opacity-50: native Kobalte menu adapters own disabled item opacity
// - data-[disabled]:pointer-events-none: native Kobalte menu adapters own disabled item hit testing
// - data-[expanded]:animate-in: native Kobalte menus mount directly without browser CSS enter animations
// - data-[expanded]:bg-accent: the native Menubar adapter owns expanded trigger background state
// - data-[expanded]:bg-muted: the native Menubar adapter owns expanded trigger background state
// - data-[expanded]:fade-in-0: native Kobalte menus mount directly without browser CSS opacity animation
// - data-[expanded]:text-accent-foreground: the native Menubar adapter owns expanded trigger foreground state
// - data-[expanded]:text-foreground: the native Menubar adapter owns expanded trigger state; arbitrary data variants are not native selectors
// - data-[expanded]:zoom-in-95: native Kobalte menus mount directly without browser CSS scale animations
// - data-[invalid]:border-error-foreground: the native TextField adapter owns invalid border state until data-state variants are native
// - data-[invalid]:text-destructive: the native TextField adapter owns invalid label/error presentation
// - data-[invalid]:text-error-foreground: the native TextField adapter owns invalid state until data-state variants are native
// - data-[placement=bottom]:slide-in-from-top-2: native FloatingLayer owns placement without CSS translate animation
// - data-[placement=left]:slide-in-from-right-2: native FloatingLayer owns placement without CSS translate animation
// - data-[placement=right]:slide-in-from-left-2: native FloatingLayer owns placement without CSS translate animation
// - data-[placement=top]:slide-in-from-bottom-2: native FloatingLayer owns placement without CSS translate animation
// - data-[state=open]:bg-accent: the native DropdownMenu sub adapter owns open-state highlighting
// - disabled:cursor-not-allowed: the native Kobalte adapter owns disabled interaction
// - disabled:opacity-50: the native Kobalte adapter owns disabled opacity
// - disabled:opacity-60: the native input/browser adapter owns disabled opacity
// - disabled:pointer-events-none: the native Kobalte adapter owns disabled pointer behavior
// - duration-75: native StyleDesc transitions are not published in GPUIX 0.7
// - file:bg-transparent: native input has no browser file-selector pseudo-element
// - file:border-0: native input has no browser file-selector pseudo-element
// - file:font-medium: native input has no browser file-selector pseudo-element
// - file:text-sm: native input has no browser file-selector pseudo-element
// - fill-current: inline GPUIX SVG styling does not expose CSS fill through StyleDesc; source currentColor stroke still inherits normally
// - focus-visible:outline: GPUIX 0.7 does not publish browser focus-outline painting through StyleDesc
// - focus-visible:outline-2: GPUIX 0.7 does not publish browser focus-outline width through StyleDesc
// - focus-visible:outline-none: native focus-visible styling is not exposed by GPUIX 0.7
// - focus-visible:outline-offset-[-2px]: GPUIX 0.7 does not publish browser focus-outline offset through StyleDesc
// - focus-visible:outline-primary: GPUIX 0.7 does not publish browser focus-outline color through StyleDesc
// - focus-visible:ring-2: native focus-visible styling is not exposed by GPUIX 0.7
// - focus-visible:ring-offset-2: native focus-visible styling is not exposed by GPUIX 0.7
// - focus-visible:ring-ring: native focus-visible styling is not exposed by GPUIX 0.7
// - focus:bg-app-surface/60: native input focus background pseudo styling is not published by GPUIX 0.7
// - focus:border-border: native focus pseudo styling is not published; this input already has the same border-border base color
// - focus:outline-none: native inputs do not paint a browser focus outline
// - focus:ring-2: GPUIX 0.7 does not publish browser focus-ring painting through StyleDesc
// - focus:ring-offset-2: GPUIX 0.7 does not publish browser focus-ring offset through StyleDesc
// - focus:ring-ring: GPUIX 0.7 does not publish browser focus-ring color through StyleDesc
// - group: Tailwind group is a relationship-state marker and has no direct painted native style
// - group-active:bg-sky-500/20: group relationship active styling is not exposed by GPUIX 0.7
// - group-hover:bg-sky-500/20: group relationship hover styling is not exposed by GPUIX 0.7
// - group-hover:text-foreground: the copied browser item already has text-foreground as its base color; native group relationship hover styling is not exposed
// - hover:brightness-110: GPUIX 0.7 does not publish CSS filter effects; this is only hover feedback on unselected clips and does not alter clip geometry or state
// - hover:underline: native text decoration is not exposed by GPUIX 0.7
// - leading-none: relative line-height needs merged font-size context before it can be represented exactly
// - max-h-(--kb-menu-content-available-height): native Kobalte FloatingLayer owns available-space popup placement/sizing; the browser CSS custom property does not exist natively
// - ml-auto: GPUIX 0.7 exposes numeric margins only; CSS auto main-axis margins are unavailable
// - origin-[var(--kb-menu-content-transform-origin)]: native Kobalte FloatingLayer owns popup placement; CSS transform-origin is not exposed by GPUIX 0.7
// - outline-none: GPUIX native inputs and menu primitives do not paint the browser outline suppressed by this utility
// - peer-disabled:cursor-not-allowed: peer variants require native relationship-state styling
// - peer-disabled:opacity-70: peer variants require native relationship-state styling
// - placeholder:text-muted-foreground: native input placeholder styling is not separately exposed by GPUIX 0.7
// - ring-offset-background: native focus ring offset styling is not exposed by GPUIX 0.7
// - row-start-1: GPUIX 0.7 does not publish grid-item row placement; the native DAW verifier asserts the collapsed controls preserve the source one-row ordering
// - selection:bg-primary/40: native text selection has its own selectionColor contract rather than CSS ::selection variants
// - shadow-background/40: this only recolors the copied context menu's layered shadow-md; GPUIX 0.7 exposes one BoxShadow and cannot represent Tailwind's layered shadow-md geometry
// - shadow-black/50: this only recolors the copied automation picker shadow-xl; GPUIX 0.7 cannot represent that layered source shadow exactly
// - shadow-inner: GPUIX 0.7 BoxShadow has no inset mode; the exact armed-record state remains preserved by its red border, background, and foreground styles
// - shadow-lg: Tailwind shadow-lg is layered; GPUIX 0.7 exposes one native BoxShadow
// - shadow-md: Tailwind shadow-md is layered; GPUIX 0.7 exposes one native BoxShadow
// - shadow-xl: Tailwind shadow-xl is layered; GPUIX 0.7 exposes one native BoxShadow and cannot represent both source shadow layers faithfully
// - tabular-nums: font-variant-numeric is not exposed by GPUIX 0.7
// - touch-none: touch-action is a browser gesture policy; the exact fade interaction owns native gesture continuity with pointer capture and window pointer listeners
// - tracking-normal: letter-spacing is not exposed by GPUIX 0.7
// - tracking-tight: letter-spacing is not exposed by GPUIX 0.7; keep the exact copied title utility registered without silently broadening unsupported typography
// - tracking-wide: letter-spacing is not exposed by GPUIX 0.7; keep the copied source unchanged until the native text contract supports it
// - tracking-widest: letter-spacing is not exposed by GPUIX 0.7
// - transition-all: native StyleDesc transitions are not published in GPUIX 0.7
// - transition-colors: native StyleDesc transitions are not published in GPUIX 0.7
// - transition-opacity: native StyleDesc transitions are not published in GPUIX 0.7
// - underline-offset-4: native text decoration offset is not exposed by GPUIX 0.7
// - w-fit: native floating content uses intrinsic sizing instead of CSS fit-content
// - w-max: native floating content uses intrinsic sizing; GPUIX 0.7 dimensions do not accept CSS max-content
// - z-0: published native StyleDesc has no z-index; retained-tree order owns this source baseline stacking level
// - z-10: published native StyleDesc has no z-index; retained-tree/layer order owns stacking
// - z-20: published native StyleDesc has no z-index; retained-tree order owns this source intermediate stacking level
// - z-30: published native StyleDesc has no z-index; retained-tree/layer order owns stacking
// - z-40: published native StyleDesc has no z-index; retained-tree/layer order owns stacking
// - z-50: native anchored-layer priority owns popup stacking
export const nativeTailwindManifest: NativeStyleManifest = {
  "classes": {
    "!cursor-pointer": {
      "base": {
        "cursor": "pointer"
      }
    },
    "!duration-150": {
      "base": {}
    },
    "!transition-transform": {
      "base": {}
    },
    "-left-1.5": {
      "base": {
        "left": -6
      }
    },
    "-mx-0.5": {
      "base": {
        "marginLeft": -2,
        "marginRight": -2
      }
    },
    "-mx-1": {
      "base": {
        "marginLeft": -4,
        "marginRight": -4
      }
    },
    "-right-1.5": {
      "base": {
        "right": -6
      }
    },
    "-top-5": {
      "base": {
        "top": -20
      }
    },
    "-translate-x-1/2": {
      "base": {},
      "translation": {
        "xFraction": -0.5
      }
    },
    "-translate-y-1/2": {
      "base": {},
      "translation": {
        "yFraction": -0.5
      }
    },
    "[&>svg]:shrink-0": {
      "descendants": {
        ">svg": {
          "base": {
            "flexShrink": 0
          }
        }
      }
    },
    "[&>svg]:size-3.5": {
      "descendants": {
        ">svg": {
          "base": {
            "width": 14,
            "height": 14
          }
        }
      }
    },
    "[&>svg]:size-4": {
      "descendants": {
        ">svg": {
          "base": {
            "width": 16,
            "height": 16
          }
        }
      }
    },
    "[&_svg]:pointer-events-none": {
      "descendants": {
        "svg": {
          "base": {
            "pointerEvents": "none"
          }
        }
      }
    },
    "[&_svg]:shrink-0": {
      "descendants": {
        "svg": {
          "base": {
            "flexShrink": 0
          }
        }
      }
    },
    "[&_svg]:size-3.5": {
      "descendants": {
        "svg": {
          "base": {
            "width": 14,
            "height": 14
          }
        }
      }
    },
    "[&_svg]:size-4": {
      "descendants": {
        "svg": {
          "base": {
            "width": 16,
            "height": 16
          }
        }
      }
    },
    "absolute": {
      "base": {
        "position": "absolute"
      }
    },
    "active:cursor-grabbing": {
      "base": {
        "active": {
          "cursor": "grabbing"
        }
      }
    },
    "active:scale-97": {
      "base": {}
    },
    "appearance-none": {
      "base": {}
    },
    "aspect-square": {
      "base": {}
    },
    "bg-amber-400": {
      "base": {
        "backgroundColor": "oklch(82.8% 0.189 84.429)"
      }
    },
    "bg-amber-500/20": {
      "base": {
        "backgroundColor": "color-mix(in oklab, oklch(76.9% 0.188 70.08) 20%, transparent)"
      }
    },
    "bg-amber-950/40": {
      "base": {
        "backgroundColor": "color-mix(in oklab, oklch(27.9% 0.077 45.635) 40%, transparent)"
      }
    },
    "bg-amber-950/50": {
      "base": {
        "backgroundColor": "color-mix(in oklab, oklch(27.9% 0.077 45.635) 50%, transparent)"
      }
    },
    "bg-app-surface": {
      "light": {
        "backgroundColor": "oklch(0.985 0.001 286)"
      },
      "dark": {
        "backgroundColor": "oklch(0.16 0.005 286)"
      }
    },
    "bg-app-surface/40": {
      "light": {
        "backgroundColor": "color-mix(in oklab, oklch(0.985 0.001 286) 40%, transparent)"
      },
      "dark": {
        "backgroundColor": "color-mix(in oklab, oklch(0.16 0.005 286) 40%, transparent)"
      }
    },
    "bg-app-surface/50": {
      "light": {
        "backgroundColor": "color-mix(in oklab, oklch(0.985 0.001 286) 50%, transparent)"
      },
      "dark": {
        "backgroundColor": "color-mix(in oklab, oklch(0.16 0.005 286) 50%, transparent)"
      }
    },
    "bg-background": {
      "light": {
        "backgroundColor": "oklch(1 0 0)"
      },
      "dark": {
        "backgroundColor": "oklch(0.141 0.005 285.823)"
      }
    },
    "bg-background/20": {
      "light": {
        "backgroundColor": "color-mix(in oklab, oklch(1 0 0) 20%, transparent)"
      },
      "dark": {
        "backgroundColor": "color-mix(in oklab, oklch(0.141 0.005 285.823) 20%, transparent)"
      }
    },
    "bg-background/35": {
      "light": {
        "backgroundColor": "color-mix(in oklab, oklch(1 0 0) 35%, transparent)"
      },
      "dark": {
        "backgroundColor": "color-mix(in oklab, oklch(0.141 0.005 285.823) 35%, transparent)"
      }
    },
    "bg-background/50": {
      "light": {
        "backgroundColor": "color-mix(in oklab, oklch(1 0 0) 50%, transparent)"
      },
      "dark": {
        "backgroundColor": "color-mix(in oklab, oklch(0.141 0.005 285.823) 50%, transparent)"
      }
    },
    "bg-background/90": {
      "light": {
        "backgroundColor": "color-mix(in oklab, oklch(1 0 0) 90%, transparent)"
      },
      "dark": {
        "backgroundColor": "color-mix(in oklab, oklch(0.141 0.005 285.823) 90%, transparent)"
      }
    },
    "bg-blue-500/25": {
      "base": {
        "backgroundColor": "color-mix(in oklab, oklch(62.3% 0.214 259.815) 25%, transparent)"
      }
    },
    "bg-blue-500/90": {
      "base": {
        "backgroundColor": "color-mix(in oklab, oklch(62.3% 0.214 259.815) 90%, transparent)"
      }
    },
    "bg-border": {
      "light": {
        "backgroundColor": "oklch(0.92 0.004 286.32)"
      },
      "dark": {
        "backgroundColor": "oklch(0.274 0.006 286.033)"
      }
    },
    "bg-border/60": {
      "light": {
        "backgroundColor": "color-mix(in oklab, oklch(0.92 0.004 286.32) 60%, transparent)"
      },
      "dark": {
        "backgroundColor": "color-mix(in oklab, oklch(0.274 0.006 286.033) 60%, transparent)"
      }
    },
    "bg-current": {
      "base": {
        "backgroundColor": "currentColor"
      }
    },
    "bg-cyan-500/15": {
      "base": {
        "backgroundColor": "color-mix(in oklab, oklch(71.5% 0.143 215.221) 15%, transparent)"
      }
    },
    "bg-cyan-500/20": {
      "base": {
        "backgroundColor": "color-mix(in oklab, oklch(71.5% 0.143 215.221) 20%, transparent)"
      }
    },
    "bg-destructive": {
      "light": {
        "backgroundColor": "oklch(0.577 0.245 27.325)"
      },
      "dark": {
        "backgroundColor": "oklch(0.396 0.141 25.723)"
      }
    },
    "bg-emerald-950/40": {
      "base": {
        "backgroundColor": "color-mix(in oklab, oklch(26.2% 0.051 172.552) 40%, transparent)"
      }
    },
    "bg-foreground": {
      "light": {
        "backgroundColor": "oklch(0.141 0.005 285.823)"
      },
      "dark": {
        "backgroundColor": "oklch(0.985 0 0)"
      }
    },
    "bg-green-400/10": {
      "base": {
        "backgroundColor": "color-mix(in oklab, oklch(79.2% 0.209 151.711) 10%, transparent)"
      }
    },
    "bg-green-500": {
      "base": {
        "backgroundColor": "oklch(72.3% 0.219 149.579)"
      }
    },
    "bg-green-500/10": {
      "base": {
        "backgroundColor": "color-mix(in oklab, oklch(72.3% 0.219 149.579) 10%, transparent)"
      }
    },
    "bg-green-600/20": {
      "base": {
        "backgroundColor": "color-mix(in oklab, oklch(62.7% 0.194 149.214) 20%, transparent)"
      }
    },
    "bg-muted": {
      "light": {
        "backgroundColor": "oklch(0.967 0.001 286.375)"
      },
      "dark": {
        "backgroundColor": "oklch(0.274 0.006 286.033)"
      }
    },
    "bg-muted-foreground": {
      "light": {
        "backgroundColor": "oklch(0.552 0.016 285.938)"
      },
      "dark": {
        "backgroundColor": "oklch(0.705 0.015 286.067)"
      }
    },
    "bg-muted/40": {
      "light": {
        "backgroundColor": "color-mix(in oklab, oklch(0.967 0.001 286.375) 40%, transparent)"
      },
      "dark": {
        "backgroundColor": "color-mix(in oklab, oklch(0.274 0.006 286.033) 40%, transparent)"
      }
    },
    "bg-neutral-900/70": {
      "base": {
        "backgroundColor": "color-mix(in oklab, oklch(20.5% 0 0) 70%, transparent)"
      }
    },
    "bg-popover": {
      "light": {
        "backgroundColor": "oklch(1 0 0)"
      },
      "dark": {
        "backgroundColor": "oklch(0.141 0.005 285.823)"
      }
    },
    "bg-primary": {
      "light": {
        "backgroundColor": "oklch(0.21 0.006 285.885)"
      },
      "dark": {
        "backgroundColor": "oklch(0.985 0 0)"
      }
    },
    "bg-red-500": {
      "base": {
        "backgroundColor": "oklch(63.7% 0.237 25.331)"
      }
    },
    "bg-red-500/20": {
      "base": {
        "backgroundColor": "color-mix(in oklab, oklch(63.7% 0.237 25.331) 20%, transparent)"
      }
    },
    "bg-red-500/90": {
      "base": {
        "backgroundColor": "color-mix(in oklab, oklch(63.7% 0.237 25.331) 90%, transparent)"
      }
    },
    "bg-red-950/75": {
      "base": {
        "backgroundColor": "color-mix(in oklab, oklch(25.8% 0.092 26.042) 75%, transparent)"
      }
    },
    "bg-secondary": {
      "light": {
        "backgroundColor": "oklch(0.967 0.001 286.375)"
      },
      "dark": {
        "backgroundColor": "oklch(0.274 0.006 286.033)"
      }
    },
    "bg-sky-950/40": {
      "base": {
        "backgroundColor": "color-mix(in oklab, oklch(29.3% 0.066 243.157) 40%, transparent)"
      }
    },
    "bg-timeline-background": {
      "light": {
        "backgroundColor": "oklch(0.975 0.001 286)"
      },
      "dark": {
        "backgroundColor": "oklch(0.11 0.003 286)"
      }
    },
    "bg-timeline-background/95": {
      "light": {
        "backgroundColor": "color-mix(in oklab, oklch(0.975 0.001 286) 95%, transparent)"
      },
      "dark": {
        "backgroundColor": "color-mix(in oklab, oklch(0.11 0.003 286) 95%, transparent)"
      }
    },
    "bg-timeline-grid-major": {
      "light": {
        "backgroundColor": "oklch(0.35 0.005 286 / 0.20)"
      },
      "dark": {
        "backgroundColor": "oklch(1 0 0 / 0.16)"
      }
    },
    "bg-timeline-grid-minor": {
      "light": {
        "backgroundColor": "oklch(0.35 0.005 286 / 0.10)"
      },
      "dark": {
        "backgroundColor": "oklch(1 0 0 / 0.08)"
      }
    },
    "bg-timeline-surface": {
      "light": {
        "backgroundColor": "oklch(0.94 0.002 286)"
      },
      "dark": {
        "backgroundColor": "oklch(0.16 0.005 286)"
      }
    },
    "bg-timeline-surface-muted": {
      "light": {
        "backgroundColor": "oklch(0.90 0.004 286)"
      },
      "dark": {
        "backgroundColor": "oklch(0.22 0.006 286)"
      }
    },
    "bg-transparent": {
      "base": {
        "backgroundColor": "transparent"
      }
    },
    "border": {
      "base": {
        "borderWidth": 1
      }
    },
    "border-0": {
      "base": {
        "borderWidth": 0
      }
    },
    "border-[0.5px]": {
      "base": {
        "borderWidth": 0.5
      }
    },
    "border-amber-500/60": {
      "base": {
        "borderColor": "color-mix(in oklab, oklch(76.9% 0.188 70.08) 60%, transparent)"
      }
    },
    "border-amber-900/60": {
      "base": {
        "borderColor": "color-mix(in oklab, oklch(41.4% 0.112 45.904) 60%, transparent)"
      }
    },
    "border-amber-900/70": {
      "base": {
        "borderColor": "color-mix(in oklab, oklch(41.4% 0.112 45.904) 70%, transparent)"
      }
    },
    "border-automation/20": {
      "light": {
        "borderColor": "color-mix(in oklab, oklch(0.64 0.21 35) 20%, transparent)"
      },
      "dark": {
        "borderColor": "color-mix(in oklab, oklch(0.70 0.20 35) 20%, transparent)"
      }
    },
    "border-automation/30": {
      "light": {
        "borderColor": "color-mix(in oklab, oklch(0.64 0.21 35) 30%, transparent)"
      },
      "dark": {
        "borderColor": "color-mix(in oklab, oklch(0.70 0.20 35) 30%, transparent)"
      }
    },
    "border-b": {
      "base": {
        "borderBottomWidth": 1
      }
    },
    "border-blue-300": {
      "base": {
        "borderColor": "oklch(80.9% 0.105 251.813)"
      }
    },
    "border-blue-400": {
      "base": {
        "borderColor": "oklch(70.7% 0.165 254.624)"
      }
    },
    "border-border": {
      "light": {
        "borderColor": "oklch(0.92 0.004 286.32)"
      },
      "dark": {
        "borderColor": "oklch(0.274 0.006 286.033)"
      }
    },
    "border-border/80": {
      "light": {
        "borderColor": "color-mix(in oklab, oklch(0.92 0.004 286.32) 80%, transparent)"
      },
      "dark": {
        "borderColor": "color-mix(in oklab, oklch(0.274 0.006 286.033) 80%, transparent)"
      }
    },
    "border-cyan-400": {
      "base": {
        "borderColor": "oklch(78.9% 0.154 211.53)"
      }
    },
    "border-dashed": {
      "base": {}
    },
    "border-emerald-900/70": {
      "base": {
        "borderColor": "color-mix(in oklab, oklch(37.8% 0.077 168.94) 70%, transparent)"
      }
    },
    "border-foreground": {
      "light": {
        "borderColor": "oklch(0.141 0.005 285.823)"
      },
      "dark": {
        "borderColor": "oklch(0.985 0 0)"
      }
    },
    "border-green-400/40": {
      "base": {
        "borderColor": "color-mix(in oklab, oklch(79.2% 0.209 151.711) 40%, transparent)"
      }
    },
    "border-green-500/50": {
      "base": {
        "borderColor": "color-mix(in oklab, oklch(72.3% 0.219 149.579) 50%, transparent)"
      }
    },
    "border-input": {
      "light": {
        "borderColor": "oklch(0.92 0.004 286.32)"
      },
      "dark": {
        "borderColor": "oklch(0.274 0.006 286.033)"
      }
    },
    "border-l": {
      "base": {
        "borderLeftWidth": 1
      }
    },
    "border-neutral-300/80": {
      "base": {
        "borderColor": "color-mix(in oklab, oklch(87% 0 0) 80%, transparent)"
      }
    },
    "border-neutral-800": {
      "base": {
        "borderColor": "oklch(26.9% 0 0)"
      }
    },
    "border-primary": {
      "light": {
        "borderColor": "oklch(0.21 0.006 285.885)"
      },
      "dark": {
        "borderColor": "oklch(0.985 0 0)"
      }
    },
    "border-r": {
      "base": {
        "borderRightWidth": 1
      }
    },
    "border-red-300/40": {
      "base": {
        "borderColor": "color-mix(in oklab, oklch(80.8% 0.114 19.571) 40%, transparent)"
      }
    },
    "border-red-400": {
      "base": {
        "borderColor": "oklch(70.4% 0.191 22.216)"
      }
    },
    "border-red-500": {
      "base": {
        "borderColor": "oklch(63.7% 0.237 25.331)"
      }
    },
    "border-red-500/20": {
      "base": {
        "borderColor": "color-mix(in oklab, oklch(63.7% 0.237 25.331) 20%, transparent)"
      }
    },
    "border-red-500/40": {
      "base": {
        "borderColor": "color-mix(in oklab, oklch(63.7% 0.237 25.331) 40%, transparent)"
      }
    },
    "border-red-500/60": {
      "base": {
        "borderColor": "color-mix(in oklab, oklch(63.7% 0.237 25.331) 60%, transparent)"
      }
    },
    "border-red-900": {
      "base": {
        "borderColor": "oklch(39.6% 0.141 25.723)"
      }
    },
    "border-sky-900/70": {
      "base": {
        "borderColor": "color-mix(in oklab, oklch(39.1% 0.09 240.876) 70%, transparent)"
      }
    },
    "border-t": {
      "base": {
        "borderTopWidth": 1
      }
    },
    "border-t-2": {
      "base": {
        "borderTopWidth": 2
      }
    },
    "border-x": {
      "base": {
        "borderLeftWidth": 1,
        "borderRightWidth": 1
      }
    },
    "border-y": {
      "base": {
        "borderTopWidth": 1,
        "borderBottomWidth": 1
      }
    },
    "bottom-0": {
      "base": {
        "bottom": 0
      }
    },
    "bottom-1": {
      "base": {
        "bottom": 4
      }
    },
    "box-border": {
      "base": {}
    },
    "col-start-3": {
      "base": {}
    },
    "col-start-4": {
      "base": {}
    },
    "contents": {
      "base": {
        "display": "contents"
      }
    },
    "cursor-col-resize": {
      "base": {
        "cursor": "col-resize"
      }
    },
    "cursor-default": {
      "base": {
        "cursor": "default"
      }
    },
    "cursor-ew-resize": {
      "base": {
        "cursor": "ew-resize"
      }
    },
    "cursor-grab": {
      "base": {
        "cursor": "grab"
      }
    },
    "cursor-move": {
      "base": {
        "cursor": "move"
      }
    },
    "cursor-not-allowed": {
      "base": {
        "cursor": "not-allowed"
      }
    },
    "cursor-ns-resize": {
      "base": {
        "cursor": "ns-resize"
      }
    },
    "cursor-pointer": {
      "base": {
        "cursor": "pointer"
      }
    },
    "cursor-row-resize": {
      "base": {
        "cursor": "row-resize"
      }
    },
    "data-[closed]:animate-out": {
      "base": {}
    },
    "data-[closed]:fade-out-0": {
      "base": {}
    },
    "data-[closed]:hidden": {
      "base": {}
    },
    "data-[closed]:zoom-out-95": {
      "base": {}
    },
    "data-[disabled]:opacity-50": {
      "base": {}
    },
    "data-[disabled]:pointer-events-none": {
      "base": {}
    },
    "data-[disabled]:text-muted-foreground": {
      "light": {
        "color": "oklch(0.552 0.016 285.938)"
      },
      "dark": {
        "color": "oklch(0.705 0.015 286.067)"
      }
    },
    "data-[expanded]:animate-in": {
      "base": {}
    },
    "data-[expanded]:bg-accent": {
      "base": {}
    },
    "data-[expanded]:bg-muted": {
      "base": {}
    },
    "data-[expanded]:fade-in-0": {
      "base": {}
    },
    "data-[expanded]:text-accent-foreground": {
      "base": {}
    },
    "data-[expanded]:text-foreground": {
      "base": {}
    },
    "data-[expanded]:text-muted-foreground": {
      "light": {
        "color": "oklch(0.552 0.016 285.938)"
      },
      "dark": {
        "color": "oklch(0.705 0.015 286.067)"
      }
    },
    "data-[expanded]:zoom-in-95": {
      "base": {}
    },
    "data-[highlighted]:bg-muted": {
      "light": {
        "backgroundColor": "oklch(0.967 0.001 286.375)"
      },
      "dark": {
        "backgroundColor": "oklch(0.274 0.006 286.033)"
      }
    },
    "data-[highlighted]:text-foreground": {
      "light": {
        "color": "oklch(0.141 0.005 285.823)"
      },
      "dark": {
        "color": "oklch(0.985 0 0)"
      }
    },
    "data-[invalid]:border-error-foreground": {
      "base": {}
    },
    "data-[invalid]:text-destructive": {
      "base": {}
    },
    "data-[invalid]:text-error-foreground": {
      "base": {}
    },
    "data-[placement=bottom]:slide-in-from-top-2": {
      "base": {}
    },
    "data-[placement=left]:slide-in-from-right-2": {
      "base": {}
    },
    "data-[placement=right]:slide-in-from-left-2": {
      "base": {}
    },
    "data-[placement=top]:slide-in-from-bottom-2": {
      "base": {}
    },
    "data-[state=open]:bg-accent": {
      "base": {}
    },
    "disabled:cursor-not-allowed": {
      "base": {}
    },
    "disabled:opacity-50": {
      "base": {}
    },
    "disabled:opacity-60": {
      "base": {}
    },
    "disabled:pointer-events-none": {
      "base": {}
    },
    "duration-75": {
      "base": {}
    },
    "file:bg-transparent": {
      "base": {}
    },
    "file:border-0": {
      "base": {}
    },
    "file:font-medium": {
      "base": {}
    },
    "file:text-sm": {
      "base": {}
    },
    "fill-current": {
      "base": {}
    },
    "fixed": {
      "base": {
        "position": "fixed"
      }
    },
    "flex": {
      "base": {
        "display": "flex"
      }
    },
    "flex-1": {
      "base": {
        "flexGrow": 1,
        "flexShrink": 1,
        "flexBasis": 0
      }
    },
    "flex-col": {
      "base": {
        "flexDirection": "column"
      }
    },
    "flex-col-reverse": {
      "base": {
        "flexDirection": "column-reverse"
      }
    },
    "flex-wrap": {
      "base": {
        "flexWrap": "wrap"
      }
    },
    "focus-visible:outline": {
      "base": {}
    },
    "focus-visible:outline-2": {
      "base": {}
    },
    "focus-visible:outline-none": {
      "base": {}
    },
    "focus-visible:outline-offset-[-2px]": {
      "base": {}
    },
    "focus-visible:outline-primary": {
      "base": {}
    },
    "focus-visible:ring-2": {
      "base": {}
    },
    "focus-visible:ring-offset-2": {
      "base": {}
    },
    "focus-visible:ring-ring": {
      "base": {}
    },
    "focus:bg-accent": {
      "base": {},
      "focus": {
        "light": {
          "backgroundColor": "oklch(0.967 0.001 286.375)"
        },
        "dark": {
          "backgroundColor": "oklch(0.274 0.006 286.033)"
        }
      }
    },
    "focus:bg-app-surface/60": {
      "base": {}
    },
    "focus:bg-muted": {
      "base": {},
      "focus": {
        "light": {
          "backgroundColor": "oklch(0.967 0.001 286.375)"
        },
        "dark": {
          "backgroundColor": "oklch(0.274 0.006 286.033)"
        }
      }
    },
    "focus:border-border": {
      "base": {}
    },
    "focus:outline-none": {
      "base": {}
    },
    "focus:ring-2": {
      "base": {}
    },
    "focus:ring-offset-2": {
      "base": {}
    },
    "focus:ring-ring": {
      "base": {}
    },
    "focus:text-accent-foreground": {
      "base": {},
      "focus": {
        "light": {
          "color": "oklch(0.21 0.006 285.885)"
        },
        "dark": {
          "color": "oklch(0.985 0 0)"
        }
      }
    },
    "focus:text-foreground": {
      "base": {},
      "focus": {
        "light": {
          "color": "oklch(0.141 0.005 285.823)"
        },
        "dark": {
          "color": "oklch(0.985 0 0)"
        }
      }
    },
    "font-bold": {
      "base": {
        "fontWeight": 700
      }
    },
    "font-medium": {
      "base": {
        "fontWeight": 500
      }
    },
    "font-normal": {
      "base": {
        "fontWeight": 400
      }
    },
    "font-semibold": {
      "base": {
        "fontWeight": 600
      }
    },
    "gap-1": {
      "base": {
        "gap": 4
      }
    },
    "gap-2": {
      "base": {
        "gap": 8
      }
    },
    "gap-3": {
      "base": {
        "gap": 12
      }
    },
    "gap-4": {
      "base": {
        "gap": 16
      }
    },
    "gap-x-2": {
      "base": {
        "columnGap": 8
      }
    },
    "gap-x-4": {
      "base": {
        "columnGap": 16
      }
    },
    "grid": {
      "base": {
        "display": "grid"
      }
    },
    "grid-cols-1": {
      "base": {
        "gridTemplateColumns": 1
      }
    },
    "grid-cols-2": {
      "base": {
        "gridTemplateColumns": 2
      }
    },
    "grid-cols-[1fr_auto_1fr]": {
      "base": {
        "display": "flex",
        "flexDirection": "row"
      }
    },
    "group": {
      "base": {}
    },
    "group-active:bg-sky-500/20": {
      "base": {}
    },
    "group-hover:bg-sky-500/20": {
      "base": {}
    },
    "group-hover:opacity-100": {
      "base": {
        "hover": {
          "opacity": 1
        }
      }
    },
    "group-hover:text-foreground": {
      "base": {}
    },
    "h-0": {
      "base": {
        "height": 0
      }
    },
    "h-1": {
      "base": {
        "height": 4
      }
    },
    "h-1.5": {
      "base": {
        "height": 6
      }
    },
    "h-10": {
      "base": {
        "height": 40
      }
    },
    "h-11": {
      "base": {
        "height": 44
      }
    },
    "h-16": {
      "base": {
        "height": 64
      }
    },
    "h-2": {
      "base": {
        "height": 8
      }
    },
    "h-2.5": {
      "base": {
        "height": 10
      }
    },
    "h-3": {
      "base": {
        "height": 12
      }
    },
    "h-3.5": {
      "base": {
        "height": 14
      }
    },
    "h-4": {
      "base": {
        "height": 16
      }
    },
    "h-5": {
      "base": {
        "height": 20
      }
    },
    "h-6": {
      "base": {
        "height": 24
      }
    },
    "h-7": {
      "base": {
        "height": 28
      }
    },
    "h-8": {
      "base": {
        "height": 32
      }
    },
    "h-9": {
      "base": {
        "height": 36
      }
    },
    "h-full": {
      "base": {
        "height": "100%"
      }
    },
    "h-px": {
      "base": {
        "height": 1
      }
    },
    "hidden": {
      "base": {
        "display": "none"
      }
    },
    "hover:bg-accent": {
      "light": {
        "hover": {
          "backgroundColor": "oklch(0.967 0.001 286.375)"
        }
      },
      "dark": {
        "hover": {
          "backgroundColor": "oklch(0.274 0.006 286.033)"
        }
      }
    },
    "hover:bg-app-surface": {
      "light": {
        "hover": {
          "backgroundColor": "oklch(0.985 0.001 286)"
        }
      },
      "dark": {
        "hover": {
          "backgroundColor": "oklch(0.16 0.005 286)"
        }
      }
    },
    "hover:bg-destructive/90": {
      "light": {
        "hover": {
          "backgroundColor": "color-mix(in oklab, oklch(0.577 0.245 27.325) 90%, transparent)"
        }
      },
      "dark": {
        "hover": {
          "backgroundColor": "color-mix(in oklab, oklch(0.396 0.141 25.723) 90%, transparent)"
        }
      }
    },
    "hover:bg-muted": {
      "light": {
        "hover": {
          "backgroundColor": "oklch(0.967 0.001 286.375)"
        }
      },
      "dark": {
        "hover": {
          "backgroundColor": "oklch(0.274 0.006 286.033)"
        }
      }
    },
    "hover:bg-primary/90": {
      "light": {
        "hover": {
          "backgroundColor": "color-mix(in oklab, oklch(0.21 0.006 285.885) 90%, transparent)"
        }
      },
      "dark": {
        "hover": {
          "backgroundColor": "color-mix(in oklab, oklch(0.985 0 0) 90%, transparent)"
        }
      }
    },
    "hover:bg-red-300/20": {
      "base": {
        "hover": {
          "backgroundColor": "color-mix(in oklab, oklch(80.8% 0.114 19.571) 20%, transparent)"
        }
      }
    },
    "hover:bg-red-500/20": {
      "base": {
        "hover": {
          "backgroundColor": "color-mix(in oklab, oklch(63.7% 0.237 25.331) 20%, transparent)"
        }
      }
    },
    "hover:bg-red-500/90": {
      "base": {
        "hover": {
          "backgroundColor": "color-mix(in oklab, oklch(63.7% 0.237 25.331) 90%, transparent)"
        }
      }
    },
    "hover:bg-secondary/80": {
      "light": {
        "hover": {
          "backgroundColor": "color-mix(in oklab, oklch(0.967 0.001 286.375) 80%, transparent)"
        }
      },
      "dark": {
        "hover": {
          "backgroundColor": "color-mix(in oklab, oklch(0.274 0.006 286.033) 80%, transparent)"
        }
      }
    },
    "hover:bg-timeline-surface-muted": {
      "light": {
        "hover": {
          "backgroundColor": "oklch(0.90 0.004 286)"
        }
      },
      "dark": {
        "hover": {
          "backgroundColor": "oklch(0.22 0.006 286)"
        }
      }
    },
    "hover:border-border": {
      "light": {
        "hover": {
          "borderColor": "oklch(0.92 0.004 286.32)"
        }
      },
      "dark": {
        "hover": {
          "borderColor": "oklch(0.274 0.006 286.033)"
        }
      }
    },
    "hover:border-red-400": {
      "base": {
        "hover": {
          "borderColor": "oklch(70.4% 0.191 22.216)"
        }
      }
    },
    "hover:border-red-400/70": {
      "base": {
        "hover": {
          "borderColor": "color-mix(in oklab, oklch(70.4% 0.191 22.216) 70%, transparent)"
        }
      }
    },
    "hover:brightness-110": {
      "base": {}
    },
    "hover:opacity-100": {
      "base": {
        "hover": {
          "opacity": 1
        }
      }
    },
    "hover:text-accent-foreground": {
      "light": {
        "hover": {
          "color": "oklch(0.21 0.006 285.885)"
        }
      },
      "dark": {
        "hover": {
          "color": "oklch(0.985 0 0)"
        }
      }
    },
    "hover:text-foreground": {
      "light": {
        "hover": {
          "color": "oklch(0.141 0.005 285.823)"
        }
      },
      "dark": {
        "hover": {
          "color": "oklch(0.985 0 0)"
        }
      }
    },
    "hover:text-muted-foreground": {
      "light": {
        "hover": {
          "color": "oklch(0.552 0.016 285.938)"
        }
      },
      "dark": {
        "hover": {
          "color": "oklch(0.705 0.015 286.067)"
        }
      }
    },
    "hover:text-red-50": {
      "base": {
        "hover": {
          "color": "oklch(97.1% 0.013 17.38)"
        }
      }
    },
    "hover:underline": {
      "base": {}
    },
    "inline-flex": {
      "base": {
        "display": "flex"
      }
    },
    "inset-0": {
      "base": {
        "top": 0,
        "right": 0,
        "bottom": 0,
        "left": 0
      }
    },
    "inset-x-0": {
      "base": {
        "left": 0,
        "right": 0
      }
    },
    "inset-y-0": {
      "base": {
        "top": 0,
        "bottom": 0
      }
    },
    "items-center": {
      "base": {
        "alignItems": "center"
      }
    },
    "items-end": {
      "base": {
        "alignItems": "flex-end"
      }
    },
    "items-start": {
      "base": {
        "alignItems": "flex-start"
      }
    },
    "justify-between": {
      "base": {
        "justifyContent": "space-between"
      }
    },
    "justify-center": {
      "base": {
        "justifyContent": "center"
      }
    },
    "justify-end": {
      "base": {
        "justifyContent": "flex-end"
      }
    },
    "justify-self-center": {
      "base": {
        "flexGrow": 0,
        "flexShrink": 0
      }
    },
    "justify-self-end": {
      "base": {
        "flexGrow": 1,
        "flexShrink": 1,
        "flexBasis": 0,
        "minWidth": 0,
        "justifyContent": "flex-end"
      }
    },
    "justify-self-start": {
      "base": {
        "flexGrow": 1,
        "flexShrink": 1,
        "flexBasis": 0,
        "minWidth": 0,
        "justifyContent": "flex-start"
      }
    },
    "justify-start": {
      "base": {
        "justifyContent": "flex-start"
      }
    },
    "leading-5": {
      "base": {
        "lineHeight": 20
      }
    },
    "leading-6": {
      "base": {
        "lineHeight": 24
      }
    },
    "leading-none": {
      "base": {}
    },
    "left-0": {
      "base": {
        "left": 0
      }
    },
    "left-1/2": {
      "base": {},
      "parentPosition": {
        "leftFraction": 0.5
      }
    },
    "left-2": {
      "base": {
        "left": 8
      }
    },
    "max-h-(--kb-menu-content-available-height)": {
      "base": {}
    },
    "max-h-80": {
      "base": {
        "maxHeight": 320
      }
    },
    "max-h-screen": {
      "base": {
        "maxHeight": "100%"
      }
    },
    "max-w-lg": {
      "base": {
        "maxWidth": 512
      }
    },
    "mb-1": {
      "base": {
        "marginBottom": 4
      }
    },
    "min-h-0": {
      "base": {
        "minHeight": 0
      }
    },
    "min-h-20": {
      "base": {
        "minHeight": 80
      }
    },
    "min-h-6": {
      "base": {
        "minHeight": 24
      }
    },
    "min-h-full": {
      "base": {
        "minHeight": "100%"
      }
    },
    "min-w-0": {
      "base": {
        "minWidth": 0
      }
    },
    "min-w-28": {
      "base": {
        "minWidth": 112
      }
    },
    "min-w-32": {
      "base": {
        "minWidth": 128
      }
    },
    "min-w-40": {
      "base": {
        "minWidth": 160
      }
    },
    "ml-auto": {
      "base": {}
    },
    "mt-1": {
      "base": {
        "marginTop": 4
      }
    },
    "my-0.5": {
      "base": {
        "marginTop": 2,
        "marginBottom": 2
      }
    },
    "my-1": {
      "base": {
        "marginTop": 4,
        "marginBottom": 4
      }
    },
    "opacity-0": {
      "base": {
        "opacity": 0
      }
    },
    "opacity-100": {
      "base": {
        "opacity": 1
      }
    },
    "opacity-30": {
      "base": {
        "opacity": 0.3
      }
    },
    "opacity-60": {
      "base": {
        "opacity": 0.6
      }
    },
    "opacity-70": {
      "base": {
        "opacity": 0.7
      }
    },
    "origin-[var(--kb-menu-content-transform-origin)]": {
      "base": {}
    },
    "outline-none": {
      "base": {}
    },
    "overflow-auto": {
      "base": {
        "overflow": "auto"
      }
    },
    "overflow-hidden": {
      "base": {
        "overflow": "hidden"
      }
    },
    "overflow-visible": {
      "base": {
        "overflow": "visible"
      }
    },
    "overflow-x-clip": {
      "base": {
        "overflowX": "clip"
      }
    },
    "overflow-x-hidden": {
      "base": {
        "overflowX": "hidden"
      }
    },
    "overflow-y-auto": {
      "base": {
        "overflowY": "auto"
      }
    },
    "p-0": {
      "base": {
        "paddingTop": 0,
        "paddingRight": 0,
        "paddingBottom": 0,
        "paddingLeft": 0
      }
    },
    "p-0.5": {
      "base": {
        "paddingTop": 2,
        "paddingRight": 2,
        "paddingBottom": 2,
        "paddingLeft": 2
      }
    },
    "p-1": {
      "base": {
        "paddingTop": 4,
        "paddingRight": 4,
        "paddingBottom": 4,
        "paddingLeft": 4
      }
    },
    "p-1.5": {
      "base": {
        "paddingTop": 6,
        "paddingRight": 6,
        "paddingBottom": 6,
        "paddingLeft": 6
      }
    },
    "p-2": {
      "base": {
        "paddingTop": 8,
        "paddingRight": 8,
        "paddingBottom": 8,
        "paddingLeft": 8
      }
    },
    "p-6": {
      "base": {
        "paddingTop": 24,
        "paddingRight": 24,
        "paddingBottom": 24,
        "paddingLeft": 24
      }
    },
    "pb-1": {
      "base": {
        "paddingBottom": 4
      }
    },
    "peer-disabled:cursor-not-allowed": {
      "base": {}
    },
    "peer-disabled:opacity-70": {
      "base": {}
    },
    "pl-3": {
      "base": {
        "paddingLeft": 12
      }
    },
    "pl-4": {
      "base": {
        "paddingLeft": 16
      }
    },
    "pl-6": {
      "base": {
        "paddingLeft": 24
      }
    },
    "pl-8": {
      "base": {
        "paddingLeft": 32
      }
    },
    "placeholder:text-muted-foreground": {
      "base": {}
    },
    "pointer-events-auto": {
      "base": {
        "pointerEvents": "auto"
      }
    },
    "pointer-events-none": {
      "base": {
        "pointerEvents": "none"
      }
    },
    "pr-1": {
      "base": {
        "paddingRight": 4
      }
    },
    "pr-2": {
      "base": {
        "paddingRight": 8
      }
    },
    "pt-1": {
      "base": {
        "paddingTop": 4
      }
    },
    "px-0": {
      "base": {
        "paddingLeft": 0,
        "paddingRight": 0
      }
    },
    "px-0.5": {
      "base": {
        "paddingLeft": 2,
        "paddingRight": 2
      }
    },
    "px-1": {
      "base": {
        "paddingLeft": 4,
        "paddingRight": 4
      }
    },
    "px-1.5": {
      "base": {
        "paddingLeft": 6,
        "paddingRight": 6
      }
    },
    "px-2": {
      "base": {
        "paddingLeft": 8,
        "paddingRight": 8
      }
    },
    "px-3": {
      "base": {
        "paddingLeft": 12,
        "paddingRight": 12
      }
    },
    "px-4": {
      "base": {
        "paddingLeft": 16,
        "paddingRight": 16
      }
    },
    "px-5": {
      "base": {
        "paddingLeft": 20,
        "paddingRight": 20
      }
    },
    "px-8": {
      "base": {
        "paddingLeft": 32,
        "paddingRight": 32
      }
    },
    "py-0.5": {
      "base": {
        "paddingTop": 2,
        "paddingBottom": 2
      }
    },
    "py-1": {
      "base": {
        "paddingTop": 4,
        "paddingBottom": 4
      }
    },
    "py-1.5": {
      "base": {
        "paddingTop": 6,
        "paddingBottom": 6
      }
    },
    "py-2": {
      "base": {
        "paddingTop": 8,
        "paddingBottom": 8
      }
    },
    "py-3": {
      "base": {
        "paddingTop": 12,
        "paddingBottom": 12
      }
    },
    "relative": {
      "base": {
        "position": "relative"
      }
    },
    "right-0": {
      "base": {
        "right": 0
      }
    },
    "right-1/2": {
      "base": {},
      "parentPosition": {
        "rightFraction": 0.5
      }
    },
    "right-4": {
      "base": {
        "right": 16
      }
    },
    "ring-1": {
      "base": {
        "boxShadow": {
          "offsetX": 0,
          "offsetY": 0,
          "blurRadius": 0,
          "spreadRadius": 1,
          "color": "rgba(0, 0, 0, 0)"
        }
      }
    },
    "ring-blue-400/80": {
      "base": {
        "boxShadow": {
          "offsetX": 0,
          "offsetY": 0,
          "blurRadius": 0,
          "spreadRadius": 1,
          "color": "rgba(81, 162, 255, 0.8)"
        }
      }
    },
    "ring-offset-background": {
      "base": {}
    },
    "rounded": {
      "base": {
        "borderRadius": 4
      }
    },
    "rounded-full": {
      "base": {
        "borderRadius": 9999
      }
    },
    "rounded-sm": {
      "base": {
        "borderRadius": 4
      }
    },
    "row-start-1": {
      "base": {}
    },
    "select-none": {
      "base": {
        "userSelect": "none"
      }
    },
    "selection:bg-primary/40": {
      "base": {}
    },
    "shadow-background/40": {
      "base": {}
    },
    "shadow-black/50": {
      "base": {}
    },
    "shadow-inner": {
      "base": {}
    },
    "shadow-lg": {
      "base": {}
    },
    "shadow-md": {
      "base": {}
    },
    "shadow-xl": {
      "base": {}
    },
    "shrink-0": {
      "base": {
        "flexShrink": 0
      }
    },
    "size-1.5": {
      "base": {
        "width": 6,
        "height": 6
      }
    },
    "size-10": {
      "base": {
        "width": 40,
        "height": 40
      }
    },
    "size-2": {
      "base": {
        "width": 8,
        "height": 8
      }
    },
    "size-3.5": {
      "base": {
        "width": 14,
        "height": 14
      }
    },
    "size-4": {
      "base": {
        "width": 16,
        "height": 16
      }
    },
    "size-full": {
      "base": {
        "width": "100%",
        "height": "100%"
      }
    },
    "sm:flex-row": {
      "base": {
        "flexDirection": "row"
      }
    },
    "sm:items-center": {
      "base": {
        "alignItems": "center"
      }
    },
    "sm:justify-end": {
      "base": {
        "justifyContent": "flex-end"
      }
    },
    "sm:space-x-2": {
      "base": {
        "gap": 8
      }
    },
    "sm:text-left": {
      "base": {
        "textAlign": "left"
      }
    },
    "space-y-0.5": {
      "base": {
        "gap": 2
      }
    },
    "space-y-1.5": {
      "base": {
        "gap": 6
      }
    },
    "sr-only": {
      "base": {
        "position": "absolute",
        "width": 1,
        "height": 1,
        "paddingTop": 0,
        "paddingRight": 0,
        "paddingBottom": 0,
        "paddingLeft": 0,
        "marginTop": -1,
        "marginRight": -1,
        "marginBottom": -1,
        "marginLeft": -1,
        "overflow": "hidden",
        "whiteSpace": "nowrap",
        "borderWidth": 0
      }
    },
    "sticky": {
      "base": {
        "position": "sticky"
      }
    },
    "tabular-nums": {
      "base": {}
    },
    "text-2xs": {
      "base": {
        "fontSize": 10,
        "lineHeight": 14
      }
    },
    "text-[10px]": {
      "base": {
        "fontSize": 10
      }
    },
    "text-[11px]": {
      "base": {
        "fontSize": 11
      }
    },
    "text-[9px]": {
      "base": {
        "fontSize": 9
      }
    },
    "text-amber-100": {
      "base": {
        "color": "oklch(96.2% 0.059 95.617)"
      }
    },
    "text-amber-100/80": {
      "base": {
        "color": "color-mix(in oklab, oklch(96.2% 0.059 95.617) 80%, transparent)"
      }
    },
    "text-amber-300": {
      "base": {
        "color": "oklch(87.9% 0.169 91.605)"
      }
    },
    "text-black": {
      "base": {
        "color": "#000"
      }
    },
    "text-blue-300": {
      "base": {
        "color": "oklch(80.9% 0.105 251.813)"
      }
    },
    "text-center": {
      "base": {
        "textAlign": "center"
      }
    },
    "text-cyan-100": {
      "base": {
        "color": "oklch(95.6% 0.045 203.388)"
      }
    },
    "text-cyan-200": {
      "base": {
        "color": "oklch(91.7% 0.08 205.041)"
      }
    },
    "text-destructive": {
      "light": {
        "color": "oklch(0.577 0.245 27.325)"
      },
      "dark": {
        "color": "oklch(0.396 0.141 25.723)"
      }
    },
    "text-destructive-foreground": {
      "base": {
        "color": "oklch(0.985 0 0)"
      }
    },
    "text-emerald-300": {
      "base": {
        "color": "oklch(84.5% 0.143 164.978)"
      }
    },
    "text-error-foreground": {
      "light": {
        "color": "oklch(0.55 0.22 27)"
      },
      "dark": {
        "color": "oklch(0.78 0.17 27)"
      }
    },
    "text-foreground": {
      "light": {
        "color": "oklch(0.141 0.005 285.823)"
      },
      "dark": {
        "color": "oklch(0.985 0 0)"
      }
    },
    "text-foreground/80": {
      "light": {
        "color": "color-mix(in oklab, oklch(0.141 0.005 285.823) 80%, transparent)"
      },
      "dark": {
        "color": "color-mix(in oklab, oklch(0.985 0 0) 80%, transparent)"
      }
    },
    "text-green-300": {
      "base": {
        "color": "oklch(87.1% 0.15 154.449)"
      }
    },
    "text-green-400": {
      "base": {
        "color": "oklch(79.2% 0.209 151.711)"
      }
    },
    "text-left": {
      "base": {
        "textAlign": "left"
      }
    },
    "text-lg": {
      "base": {
        "fontSize": 18,
        "lineHeight": 28
      }
    },
    "text-muted-foreground": {
      "light": {
        "color": "oklch(0.552 0.016 285.938)"
      },
      "dark": {
        "color": "oklch(0.705 0.015 286.067)"
      }
    },
    "text-neutral-400": {
      "base": {
        "color": "oklch(70.8% 0 0)"
      }
    },
    "text-popover-foreground": {
      "light": {
        "color": "oklch(0.141 0.005 285.823)"
      },
      "dark": {
        "color": "oklch(0.985 0 0)"
      }
    },
    "text-primary": {
      "light": {
        "color": "oklch(0.21 0.006 285.885)"
      },
      "dark": {
        "color": "oklch(0.985 0 0)"
      }
    },
    "text-primary-foreground": {
      "light": {
        "color": "oklch(0.985 0 0)"
      },
      "dark": {
        "color": "oklch(0.21 0.006 285.885)"
      }
    },
    "text-red-100": {
      "base": {
        "color": "oklch(93.6% 0.032 17.717)"
      }
    },
    "text-red-200": {
      "base": {
        "color": "oklch(88.5% 0.062 18.334)"
      }
    },
    "text-red-200/70": {
      "base": {
        "color": "color-mix(in oklab, oklch(88.5% 0.062 18.334) 70%, transparent)"
      }
    },
    "text-red-300": {
      "base": {
        "color": "oklch(80.8% 0.114 19.571)"
      }
    },
    "text-red-400": {
      "base": {
        "color": "oklch(70.4% 0.191 22.216)"
      }
    },
    "text-red-50": {
      "base": {
        "color": "oklch(97.1% 0.013 17.38)"
      }
    },
    "text-red-900": {
      "base": {
        "color": "oklch(39.6% 0.141 25.723)"
      }
    },
    "text-right": {
      "base": {
        "textAlign": "right"
      }
    },
    "text-secondary-foreground": {
      "light": {
        "color": "oklch(0.21 0.006 285.885)"
      },
      "dark": {
        "color": "oklch(0.985 0 0)"
      }
    },
    "text-sky-300": {
      "base": {
        "color": "oklch(82.8% 0.111 230.318)"
      }
    },
    "text-sm": {
      "base": {
        "fontSize": 14,
        "lineHeight": 20
      }
    },
    "text-xs": {
      "base": {
        "fontSize": 12,
        "lineHeight": 16
      }
    },
    "text-xxs": {
      "base": {
        "fontSize": 11,
        "lineHeight": 14
      }
    },
    "top-0": {
      "base": {
        "top": 0
      }
    },
    "top-1": {
      "base": {
        "top": 4
      }
    },
    "top-1/2": {
      "base": {},
      "parentPosition": {
        "topFraction": 0.5
      }
    },
    "top-4": {
      "base": {
        "top": 16
      }
    },
    "top-full": {
      "base": {},
      "parentPosition": {
        "topFraction": 1
      }
    },
    "touch-none": {
      "base": {}
    },
    "tracking-normal": {
      "base": {}
    },
    "tracking-tight": {
      "base": {}
    },
    "tracking-wide": {
      "base": {}
    },
    "tracking-widest": {
      "base": {}
    },
    "transition-all": {
      "base": {}
    },
    "transition-colors": {
      "base": {}
    },
    "transition-opacity": {
      "base": {}
    },
    "translate-x-1/2": {
      "base": {},
      "translation": {
        "xFraction": 0.5
      }
    },
    "translate-y-1/2": {
      "base": {},
      "translation": {
        "yFraction": 0.5
      }
    },
    "truncate": {
      "base": {
        "overflow": "hidden",
        "textOverflow": "ellipsis",
        "whiteSpace": "nowrap"
      }
    },
    "underline-offset-4": {
      "base": {}
    },
    "uppercase": {
      "base": {},
      "textTransform": "uppercase"
    },
    "w-0.5": {
      "base": {
        "width": 2
      }
    },
    "w-1": {
      "base": {
        "width": 4
      }
    },
    "w-1.5": {
      "base": {
        "width": 6
      }
    },
    "w-2": {
      "base": {
        "width": 8
      }
    },
    "w-3": {
      "base": {
        "width": 12
      }
    },
    "w-3.5": {
      "base": {
        "width": 14
      }
    },
    "w-4": {
      "base": {
        "width": 16
      }
    },
    "w-5": {
      "base": {
        "width": 20
      }
    },
    "w-6": {
      "base": {
        "width": 24
      }
    },
    "w-7": {
      "base": {
        "width": 28
      }
    },
    "w-72": {
      "base": {
        "width": 288
      }
    },
    "w-8": {
      "base": {
        "width": 32
      }
    },
    "w-auto": {
      "base": {
        "width": "auto"
      }
    },
    "w-fit": {
      "base": {}
    },
    "w-full": {
      "base": {
        "width": "100%"
      }
    },
    "w-max": {
      "base": {}
    },
    "w-px": {
      "base": {
        "width": 1
      }
    },
    "whitespace-nowrap": {
      "base": {
        "whiteSpace": "nowrap"
      }
    },
    "z-0": {
      "base": {}
    },
    "z-10": {
      "base": {}
    },
    "z-20": {
      "base": {}
    },
    "z-30": {
      "base": {}
    },
    "z-40": {
      "base": {}
    },
    "z-50": {
      "base": {}
    }
  }
}

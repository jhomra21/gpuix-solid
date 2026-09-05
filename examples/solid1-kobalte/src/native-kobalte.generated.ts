import type { NativeStyleManifest } from "@jhomra21/gpuix-solid1"

export const nativeKobalteManifest: NativeStyleManifest = {
  "classes": {
    "kb_button_button": {
      "base": {
        "display": "flex",
        "justifyContent": "center",
        "alignItems": "center",
        "height": 40,
        "width": "auto",
        "borderRadius": 6,
        "paddingTop": 0,
        "paddingRight": 16,
        "paddingBottom": 0,
        "paddingLeft": 16,
        "backgroundColor": "hsl(200 98% 39%)",
        "color": "white",
        "fontSize": 16,
        "lineHeight": 0,
        "hover": {
          "backgroundColor": "hsl(201 96% 32%)"
        },
        "active": {
          "backgroundColor": "hsl(201 90% 27%)"
        }
      },
      "dark": {
        "backgroundColor": "hsl(201 96% 32%)",
        "color": "hsla(0 100% 100% / 0.9)",
        "hover": {
          "backgroundColor": "hsl(200 98% 39%)"
        },
        "active": {
          "backgroundColor": "hsl(199 89% 48%)"
        }
      }
    },
    "kb_context-menu_context-menu__trigger": {
      "base": {
        "display": "block",
        "borderWidth": 2,
        "borderColor": "hsl(240 4% 46%)",
        "color": "hsl(240 5% 34%)",
        "borderRadius": 4,
        "fontSize": 15,
        "userSelect": "none",
        "paddingTop": 45,
        "paddingRight": 0,
        "paddingBottom": 45,
        "paddingLeft": 0,
        "width": 300,
        "textAlign": "center"
      },
      "dark": {
        "borderColor": "rgb(255 255 255 / 0.5)",
        "color": "rgb(255 255 255 / 0.7)"
      }
    },
    "kb_context-menu_context-menu__content": {
      "base": {
        "minWidth": 220,
        "padding": 8,
        "backgroundColor": "white",
        "borderRadius": 6,
        "borderWidth": 1,
        "borderColor": "hsl(240 6% 90%)"
      },
      "dark": {
        "borderWidth": 1,
        "borderColor": "hsl(240 5% 26%)",
        "backgroundColor": "hsl(240 4% 16%)"
      }
    },
    "kb_context-menu_context-menu__sub-content": {
      "base": {
        "minWidth": 220,
        "padding": 8,
        "backgroundColor": "white",
        "borderRadius": 6,
        "borderWidth": 1,
        "borderColor": "hsl(240 6% 90%)"
      },
      "dark": {
        "borderWidth": 1,
        "borderColor": "hsl(240 5% 26%)",
        "backgroundColor": "hsl(240 4% 16%)"
      }
    },
    "kb_context-menu_context-menu__item": {
      "base": {
        "fontSize": 16,
        "lineHeight": 16,
        "color": "hsl(240 4% 16%)",
        "borderRadius": 4,
        "display": "flex",
        "alignItems": "center",
        "height": 32,
        "paddingTop": 0,
        "paddingRight": 8,
        "paddingBottom": 0,
        "paddingLeft": 24,
        "position": "relative",
        "userSelect": "none",
        "hover": {
          "backgroundColor": "hsl(200 98% 39%)",
          "color": "white"
        }
      },
      "dark": {
        "color": "hsl(0 100% 100% / 0.9)"
      }
    },
    "kb_context-menu_context-menu__checkbox-item": {
      "base": {
        "fontSize": 16,
        "lineHeight": 16,
        "color": "hsl(240 4% 16%)",
        "borderRadius": 4,
        "display": "flex",
        "alignItems": "center",
        "height": 32,
        "paddingTop": 0,
        "paddingRight": 8,
        "paddingBottom": 0,
        "paddingLeft": 24,
        "position": "relative",
        "userSelect": "none",
        "hover": {
          "backgroundColor": "hsl(200 98% 39%)",
          "color": "white"
        }
      },
      "dark": {
        "color": "hsl(0 100% 100% / 0.9)"
      }
    },
    "kb_context-menu_context-menu__radio-item": {
      "base": {
        "fontSize": 16,
        "lineHeight": 16,
        "color": "hsl(240 4% 16%)",
        "borderRadius": 4,
        "display": "flex",
        "alignItems": "center",
        "height": 32,
        "paddingTop": 0,
        "paddingRight": 8,
        "paddingBottom": 0,
        "paddingLeft": 24,
        "position": "relative",
        "userSelect": "none",
        "hover": {
          "backgroundColor": "hsl(200 98% 39%)",
          "color": "white"
        }
      },
      "dark": {
        "color": "hsl(0 100% 100% / 0.9)"
      }
    },
    "kb_context-menu_context-menu__sub-trigger": {
      "base": {
        "fontSize": 16,
        "lineHeight": 16,
        "color": "hsl(240 4% 16%)",
        "borderRadius": 4,
        "display": "flex",
        "alignItems": "center",
        "height": 32,
        "paddingTop": 0,
        "paddingRight": 8,
        "paddingBottom": 0,
        "paddingLeft": 24,
        "position": "relative",
        "userSelect": "none",
        "hover": {
          "backgroundColor": "hsl(200 98% 39%)",
          "color": "white"
        }
      },
      "dark": {
        "color": "hsl(0 100% 100% / 0.9)"
      }
    },
    "kb_context-menu_context-menu__group-label": {
      "base": {
        "paddingTop": 0,
        "paddingRight": 24,
        "paddingBottom": 0,
        "paddingLeft": 24,
        "fontSize": 14,
        "lineHeight": 32,
        "color": "hsl(240 4% 46%)"
      },
      "dark": {
        "color": "hsl(0 100% 100% / 0.7)"
      }
    },
    "kb_context-menu_context-menu__separator": {
      "base": {
        "height": 1,
        "borderTopWidth": 1,
        "borderColor": "hsl(240 6% 90%)",
        "margin": 6
      },
      "dark": {
        "borderColor": "hsl(240 5% 34%)"
      }
    },
    "kb_context-menu_context-menu__item-indicator": {
      "base": {
        "position": "absolute",
        "left": 0,
        "height": 20,
        "width": 20,
        "display": "flex",
        "alignItems": "center",
        "justifyContent": "center"
      }
    },
    "kb_context-menu_context-menu__item-right-slot": {
      "base": {
        "paddingLeft": 20,
        "fontSize": 14,
        "color": "hsl(240 4% 46%)"
      }
    },
    "kb_dialog_dialog__trigger": {
      "base": {
        "display": "flex",
        "justifyContent": "center",
        "alignItems": "center",
        "height": 40,
        "width": "auto",
        "borderRadius": 6,
        "paddingTop": 0,
        "paddingRight": 16,
        "paddingBottom": 0,
        "paddingLeft": 16,
        "backgroundColor": "hsl(200 98% 39%)",
        "color": "white",
        "fontSize": 16,
        "lineHeight": 0,
        "hover": {
          "backgroundColor": "hsl(201 96% 32%)"
        },
        "active": {
          "backgroundColor": "hsl(201 90% 27%)"
        }
      },
      "dark": {
        "backgroundColor": "hsl(201 96% 32%)",
        "color": "hsla(0 100% 100% / 0.9)",
        "hover": {
          "backgroundColor": "hsl(200 98% 39%)"
        },
        "active": {
          "backgroundColor": "hsl(199 89% 48%)"
        }
      }
    },
    "kb_dialog_dialog__overlay": {
      "base": {
        "position": "absolute",
        "top": 0,
        "right": 0,
        "bottom": 0,
        "left": 0,
        "backgroundColor": "rgb(0 0 0 / 0.2)"
      }
    },
    "kb_dialog_dialog__positioner": {
      "base": {
        "position": "absolute",
        "top": 0,
        "right": 0,
        "bottom": 0,
        "left": 0,
        "display": "flex",
        "alignItems": "center",
        "justifyContent": "center"
      }
    },
    "kb_dialog_dialog__content": {
      "base": {
        "maxWidth": 500,
        "borderWidth": 1,
        "borderColor": "hsl(240 5% 84%)",
        "borderRadius": 6,
        "padding": 16,
        "backgroundColor": "white"
      },
      "dark": {
        "borderWidth": 1,
        "borderColor": "hsl(240 5% 26%)",
        "backgroundColor": "hsl(240 4% 16%)"
      }
    },
    "kb_dialog_dialog__header": {
      "base": {
        "display": "flex",
        "alignItems": "baseline",
        "justifyContent": "space-between",
        "marginBottom": 12
      }
    },
    "kb_dialog_dialog__close-button": {
      "base": {
        "height": 25,
        "width": 25,
        "color": "hsl(240 5% 34%)"
      },
      "dark": {
        "color": "hsl(0 100% 100% / 0.8)"
      }
    },
    "kb_dialog_dialog__title": {
      "base": {
        "fontSize": 20,
        "fontWeight": 500,
        "color": "hsl(240 6% 10%)"
      },
      "dark": {
        "color": "hsl(0 100% 100% / 0.9)"
      }
    },
    "kb_dialog_dialog__description": {
      "base": {
        "fontSize": 16,
        "color": "hsl(240 5% 26%)"
      },
      "dark": {
        "color": "hsl(0 100% 100% / 0.7)"
      }
    },
    "kb_dropdown-menu_dropdown-menu__trigger": {
      "base": {
        "display": "flex",
        "justifyContent": "center",
        "alignItems": "center",
        "height": 40,
        "width": "auto",
        "borderRadius": 6,
        "paddingTop": 0,
        "paddingRight": 16,
        "paddingBottom": 0,
        "paddingLeft": 16,
        "backgroundColor": "hsl(200 98% 39%)",
        "color": "white",
        "fontSize": 16,
        "gap": 8,
        "lineHeight": 0,
        "hover": {
          "backgroundColor": "hsl(201 96% 32%)"
        },
        "active": {
          "backgroundColor": "hsl(201 90% 27%)"
        }
      }
    },
    "kb_dropdown-menu_dropdown-menu__trigger-icon": {
      "base": {
        "height": 20,
        "width": 20,
        "flexGrow": 0,
        "flexShrink": 0,
        "flexBasis": 20
      }
    },
    "kb_dropdown-menu_dropdown-menu__content": {
      "base": {
        "minWidth": 220,
        "padding": 8,
        "backgroundColor": "white",
        "borderRadius": 6,
        "borderWidth": 1,
        "borderColor": "hsl(240 6% 90%)"
      },
      "dark": {
        "borderWidth": 1,
        "borderColor": "hsl(240 5% 26%)",
        "backgroundColor": "hsl(240 4% 16%)"
      }
    },
    "kb_dropdown-menu_dropdown-menu__sub-content": {
      "base": {
        "minWidth": 220,
        "padding": 8,
        "backgroundColor": "white",
        "borderRadius": 6,
        "borderWidth": 1,
        "borderColor": "hsl(240 6% 90%)"
      },
      "dark": {
        "borderWidth": 1,
        "borderColor": "hsl(240 5% 26%)",
        "backgroundColor": "hsl(240 4% 16%)"
      }
    },
    "kb_dropdown-menu_dropdown-menu__item": {
      "base": {
        "fontSize": 16,
        "lineHeight": 16,
        "color": "hsl(240 4% 16%)",
        "borderRadius": 4,
        "display": "flex",
        "alignItems": "center",
        "height": 32,
        "paddingTop": 0,
        "paddingRight": 8,
        "paddingBottom": 0,
        "paddingLeft": 24,
        "position": "relative",
        "userSelect": "none",
        "hover": {
          "backgroundColor": "hsl(200 98% 39%)",
          "color": "white"
        }
      },
      "dark": {
        "color": "hsl(0 100% 100% / 0.9)"
      }
    },
    "kb_dropdown-menu_dropdown-menu__checkbox-item": {
      "base": {
        "fontSize": 16,
        "lineHeight": 16,
        "color": "hsl(240 4% 16%)",
        "borderRadius": 4,
        "display": "flex",
        "alignItems": "center",
        "height": 32,
        "paddingTop": 0,
        "paddingRight": 8,
        "paddingBottom": 0,
        "paddingLeft": 24,
        "position": "relative",
        "userSelect": "none",
        "hover": {
          "backgroundColor": "hsl(200 98% 39%)",
          "color": "white"
        }
      },
      "dark": {
        "color": "hsl(0 100% 100% / 0.9)"
      }
    },
    "kb_dropdown-menu_dropdown-menu__radio-item": {
      "base": {
        "fontSize": 16,
        "lineHeight": 16,
        "color": "hsl(240 4% 16%)",
        "borderRadius": 4,
        "display": "flex",
        "alignItems": "center",
        "height": 32,
        "paddingTop": 0,
        "paddingRight": 8,
        "paddingBottom": 0,
        "paddingLeft": 24,
        "position": "relative",
        "userSelect": "none",
        "hover": {
          "backgroundColor": "hsl(200 98% 39%)",
          "color": "white"
        }
      },
      "dark": {
        "color": "hsl(0 100% 100% / 0.9)"
      }
    },
    "kb_dropdown-menu_dropdown-menu__sub-trigger": {
      "base": {
        "fontSize": 16,
        "lineHeight": 16,
        "color": "hsl(240 4% 16%)",
        "borderRadius": 4,
        "display": "flex",
        "alignItems": "center",
        "height": 32,
        "paddingTop": 0,
        "paddingRight": 8,
        "paddingBottom": 0,
        "paddingLeft": 24,
        "position": "relative",
        "userSelect": "none",
        "hover": {
          "backgroundColor": "hsl(200 98% 39%)",
          "color": "white"
        }
      },
      "dark": {
        "color": "hsl(0 100% 100% / 0.9)"
      }
    },
    "kb_dropdown-menu_dropdown-menu__group-label": {
      "base": {
        "paddingTop": 0,
        "paddingRight": 24,
        "paddingBottom": 0,
        "paddingLeft": 24,
        "fontSize": 14,
        "lineHeight": 32,
        "color": "hsl(240 4% 46%)"
      },
      "dark": {
        "color": "hsl(0 100% 100% / 0.7)"
      }
    },
    "kb_dropdown-menu_dropdown-menu__separator": {
      "base": {
        "height": 1,
        "borderTopWidth": 1,
        "borderColor": "hsl(240 6% 90%)",
        "margin": 6
      },
      "dark": {
        "borderColor": "hsl(240 5% 34%)"
      }
    },
    "kb_dropdown-menu_dropdown-menu__item-indicator": {
      "base": {
        "position": "absolute",
        "left": 0,
        "height": 20,
        "width": 20,
        "display": "flex",
        "alignItems": "center",
        "justifyContent": "center"
      }
    },
    "kb_dropdown-menu_dropdown-menu__item-right-slot": {
      "base": {
        "paddingLeft": 20,
        "fontSize": 14,
        "color": "hsl(240 4% 46%)"
      }
    },
    "kb_image_image": {
      "base": {
        "display": "flex",
        "alignItems": "center",
        "justifyContent": "center",
        "overflow": "hidden",
        "userSelect": "none",
        "width": 56,
        "height": 56,
        "borderRadius": 9999,
        "backgroundColor": "hsl(240 6% 90%)"
      }
    },
    "kb_image_image__img": {
      "base": {
        "width": "100%",
        "height": "100%",
        "borderRadius": 0
      }
    },
    "kb_image_image__fallback": {
      "base": {
        "width": "100%",
        "height": "100%",
        "display": "flex",
        "alignItems": "center",
        "justifyContent": "center",
        "backgroundColor": "hsl(204 94% 94%)",
        "color": "hsl(201 96% 32%)",
        "fontSize": 16,
        "lineHeight": 16,
        "fontWeight": 500
      },
      "dark": {
        "backgroundColor": "hsl(202 80% 24%)",
        "color": "hsl(198 93% 60%)"
      }
    },
    "kb_menubar_menubar__root": {
      "base": {
        "display": "flex",
        "justifyContent": "center",
        "alignItems": "center"
      }
    },
    "kb_menubar_menubar__trigger": {
      "base": {
        "display": "flex",
        "justifyContent": "center",
        "alignItems": "center",
        "height": 40,
        "width": "auto",
        "paddingTop": 0,
        "paddingRight": 16,
        "paddingBottom": 0,
        "paddingLeft": 16,
        "backgroundColor": "#f6f6f7",
        "color": "hsl(240 4% 16%)",
        "fontSize": 16,
        "gap": 8,
        "lineHeight": 0,
        "hover": {
          "backgroundColor": "hsl(200 98% 39%)",
          "color": "white"
        }
      },
      "dark": {
        "backgroundColor": "hsl(240 4% 16%)",
        "color": "hsl(0 100% 100% / 0.9)",
        "hover": {
          "backgroundColor": "hsl(201 96% 32%)",
          "color": "hsla(0 100% 100% / 0.9)"
        }
      }
    },
    "kb_menubar_menubar__content": {
      "base": {
        "minWidth": 220,
        "padding": 8,
        "backgroundColor": "white",
        "borderRadius": 6,
        "borderWidth": 1,
        "borderColor": "hsl(240 6% 90%)"
      },
      "dark": {
        "borderWidth": 1,
        "borderColor": "hsl(240 5% 26%)",
        "backgroundColor": "hsl(240 4% 16%)"
      }
    },
    "kb_menubar_menubar__sub-content": {
      "base": {
        "minWidth": 220,
        "padding": 8,
        "backgroundColor": "white",
        "borderRadius": 6,
        "borderWidth": 1,
        "borderColor": "hsl(240 6% 90%)"
      },
      "dark": {
        "borderWidth": 1,
        "borderColor": "hsl(240 5% 26%)",
        "backgroundColor": "hsl(240 4% 16%)"
      }
    },
    "kb_menubar_menubar__item": {
      "base": {
        "fontSize": 16,
        "lineHeight": 16,
        "color": "hsl(240 4% 16%)",
        "borderRadius": 4,
        "display": "flex",
        "alignItems": "center",
        "height": 32,
        "paddingTop": 0,
        "paddingRight": 8,
        "paddingBottom": 0,
        "paddingLeft": 24,
        "position": "relative",
        "userSelect": "none",
        "hover": {
          "backgroundColor": "hsl(200 98% 39%)",
          "color": "white"
        }
      },
      "dark": {
        "color": "hsl(0 100% 100% / 0.9)"
      }
    },
    "kb_menubar_menubar__checkbox-item": {
      "base": {
        "fontSize": 16,
        "lineHeight": 16,
        "color": "hsl(240 4% 16%)",
        "borderRadius": 4,
        "display": "flex",
        "alignItems": "center",
        "height": 32,
        "paddingTop": 0,
        "paddingRight": 8,
        "paddingBottom": 0,
        "paddingLeft": 24,
        "position": "relative",
        "userSelect": "none",
        "hover": {
          "backgroundColor": "hsl(200 98% 39%)",
          "color": "white"
        }
      },
      "dark": {
        "color": "hsl(0 100% 100% / 0.9)"
      }
    },
    "kb_menubar_menubar__radio-item": {
      "base": {
        "fontSize": 16,
        "lineHeight": 16,
        "color": "hsl(240 4% 16%)",
        "borderRadius": 4,
        "display": "flex",
        "alignItems": "center",
        "height": 32,
        "paddingTop": 0,
        "paddingRight": 8,
        "paddingBottom": 0,
        "paddingLeft": 24,
        "position": "relative",
        "userSelect": "none",
        "hover": {
          "backgroundColor": "hsl(200 98% 39%)",
          "color": "white"
        }
      },
      "dark": {
        "color": "hsl(0 100% 100% / 0.9)"
      }
    },
    "kb_menubar_menubar__sub-trigger": {
      "base": {
        "fontSize": 16,
        "lineHeight": 16,
        "color": "hsl(240 4% 16%)",
        "borderRadius": 4,
        "display": "flex",
        "alignItems": "center",
        "height": 32,
        "paddingTop": 0,
        "paddingRight": 8,
        "paddingBottom": 0,
        "paddingLeft": 24,
        "position": "relative",
        "userSelect": "none",
        "hover": {
          "backgroundColor": "hsl(200 98% 39%)",
          "color": "white"
        }
      },
      "dark": {
        "color": "hsl(0 100% 100% / 0.9)"
      }
    },
    "kb_menubar_menubar__group-label": {
      "base": {
        "paddingTop": 0,
        "paddingRight": 24,
        "paddingBottom": 0,
        "paddingLeft": 24,
        "fontSize": 14,
        "lineHeight": 32,
        "color": "hsl(240 4% 46%)"
      },
      "dark": {
        "color": "hsl(0 100% 100% / 0.7)"
      }
    },
    "kb_menubar_menubar__separator": {
      "base": {
        "height": 1,
        "borderTopWidth": 1,
        "borderColor": "hsl(240 6% 90%)",
        "margin": 6
      },
      "dark": {
        "borderColor": "hsl(240 5% 34%)"
      }
    },
    "kb_menubar_menubar__item-indicator": {
      "base": {
        "position": "absolute",
        "left": 0,
        "height": 20,
        "width": 20,
        "display": "flex",
        "alignItems": "center",
        "justifyContent": "center"
      }
    },
    "kb_menubar_menubar__item-right-slot": {
      "base": {
        "paddingLeft": 20,
        "fontSize": 14,
        "color": "hsl(240 4% 46%)"
      }
    },
    "kb_separator_separator": {
      "base": {
        "backgroundColor": "hsl(240 5% 84%)",
        "height": 1,
        "width": "100%"
      },
      "dark": {
        "backgroundColor": "hsl(240 5% 26%)"
      }
    },
    "kb_text-field_text-field": {
      "base": {
        "display": "flex",
        "flexDirection": "column",
        "gap": 4
      }
    },
    "kb_text-field_text-field__label": {
      "base": {
        "color": "hsl(240 6% 10%)",
        "fontSize": 14,
        "fontWeight": 500,
        "userSelect": "none"
      },
      "dark": {
        "color": "hsl(240 5% 84%)"
      }
    },
    "kb_text-field_text-field__input": {
      "base": {
        "display": "flex",
        "width": 200,
        "borderRadius": 6,
        "paddingTop": 6,
        "paddingRight": 12,
        "paddingBottom": 6,
        "paddingLeft": 12,
        "fontSize": 16,
        "backgroundColor": "white",
        "borderWidth": 1,
        "borderColor": "hsl(240 6% 90%)",
        "color": "hsl(240 4% 16%)",
        "hover": {
          "borderColor": "hsl(240 5% 65%)"
        }
      },
      "dark": {
        "backgroundColor": "hsl(240 4% 16%)",
        "borderWidth": 1,
        "borderColor": "hsl(240 5% 34%)",
        "color": "hsl(0 100% 100% / 0.9)",
        "hover": {
          "borderColor": "hsl(240 4% 46%)"
        }
      }
    },
    "kb_text-field_text-field__description": {
      "base": {
        "color": "hsl(240 5% 26%)",
        "fontSize": 12,
        "userSelect": "none"
      },
      "dark": {
        "color": "hsl(240 5% 65%)"
      }
    },
    "kb_text-field_text-field__error-message": {
      "base": {
        "color": "hsl(0 72% 51%)",
        "fontSize": 12,
        "userSelect": "none"
      }
    },
    "kb_tooltip_tooltip__trigger": {
      "base": {
        "display": "flex",
        "justifyContent": "center",
        "alignItems": "center",
        "height": 40,
        "width": "auto",
        "borderRadius": 6,
        "paddingTop": 0,
        "paddingRight": 16,
        "paddingBottom": 0,
        "paddingLeft": 16,
        "backgroundColor": "hsl(200 98% 39%)",
        "color": "white",
        "fontSize": 16,
        "lineHeight": 0,
        "hover": {
          "backgroundColor": "hsl(201 96% 32%)"
        },
        "active": {
          "backgroundColor": "hsl(201 90% 27%)"
        }
      },
      "dark": {
        "backgroundColor": "hsl(201 96% 32%)",
        "color": "hsla(0 100% 100% / 0.9)",
        "hover": {
          "backgroundColor": "hsl(200 98% 39%)"
        },
        "active": {
          "backgroundColor": "hsl(199 89% 48%)"
        }
      }
    },
    "kb_tooltip_tooltip__content": {
      "base": {
        "maxWidth": 380,
        "borderWidth": 1,
        "borderColor": "hsl(240 5% 84%)",
        "borderRadius": 6,
        "padding": 8,
        "backgroundColor": "hsl(240 4% 16%)",
        "color": "white",
        "fontSize": 14
      },
      "dark": {
        "borderWidth": 1,
        "borderColor": "hsl(240 5% 26%)",
        "backgroundColor": "hsl(0 0% 100% / 0.9)",
        "color": "hsl(240 4% 16%)"
      }
    }
  }
}

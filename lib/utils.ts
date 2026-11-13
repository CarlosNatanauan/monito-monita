import { createCn } from "cn/config"

// Teach the class merger about our custom tokens from app/globals.css.
// Without this, `text-body` (font size) and `text-ube` (color) are
// treated as conflicting and one of them is silently dropped.
export const cn = createCn({
  extend: {
    theme: {
      text: [
        "small",
        "body",
        "button",
        "title",
        "heading-sm",
        "heading",
        "heading-lg",
        "hand-sm",
        "hand",
        "hand-lg",
        "hand-xl",
      ],
      font: ["hand", "display"],
    },
  },
})

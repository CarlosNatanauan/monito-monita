import { createCn } from "cn/config"

// Teach the class merger about our custom tokens from app/globals.css.
// Without this, `text-body` (font size) and `text-foreground` (color) are
// treated as conflicting and one of them is silently dropped.
export const cn = createCn({
  extend: {
    theme: {
      text: ["caption", "body", "title", "heading", "display"],
      font: ["hand", "heading"],
    },
  },
})

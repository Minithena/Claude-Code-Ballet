// Repaints a frame's half-block cells so they hold up in terminals with line
// spacing, where a block glyph does not fill its whole cell and a strip at
// the top of each cell shows the cell's background instead.
//
// toons' renderer draws two pixels to a cell as an upper half block, the top
// pixel in the foreground and the bottom one in the background, so there that
// strip shows the bottom pixel's color: a thin line of the eyes or the tutu
// across Clawd, and gaps between the rows of anything solid. Here a cell whose
// two pixels match becomes a space filled with that color, which covers the
// whole cell, and one whose pixels differ becomes a lower half block, the
// bottom pixel in the foreground, so the strip shows the top pixel's color.
// In a terminal that draws blocks exactly, both look as before.

import { CLEAR, encode } from './effects'

const UPPER = 0x2580
const LOWER = 0x2584
const FULL = 0x2588
const SPACE = 0x20

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const VALUE = new Int16Array(128).fill(0)
for (let i = 0; i < B64.length; i++) VALUE[B64.charCodeAt(i)] = i

// A Raster's base64 cells back to their words. Hook modules have no atob,
// so it is spelled out.
export function decode(cells: string): Uint32Array {
  const text = cells.replace(/=+$/, '')
  const bytes = new Uint8Array(Math.floor((text.length * 3) / 4))
  let out = 0
  for (let i = 0; i < text.length; i += 4) {
    const v = (VALUE[text.charCodeAt(i)]! << 18) | (VALUE[text.charCodeAt(i + 1)]! << 12) | ((VALUE[text.charCodeAt(i + 2)] ?? 0) << 6) | (VALUE[text.charCodeAt(i + 3)] ?? 0)
    if (out < bytes.length) bytes[out++] = (v >> 16) & 255
    if (out < bytes.length) bytes[out++] = (v >> 8) & 255
    if (out < bytes.length) bytes[out++] = v & 255
  }

  return new Uint32Array(bytes.buffer, 0, Math.floor(bytes.length / 4))
}

// Words are three to a cell: glyph, foreground, background.
export function solidify(cells: string): string {
  const words = decode(cells)
  for (let at = 0; at + 2 < words.length; at += 3) {
    const ch = words[at]
    const fg = words[at + 1]!
    const bg = words[at + 2]!
    if (fg === CLEAR) continue
    if (ch === FULL || ((ch === UPPER || ch === LOWER) && fg === bg)) {
      words[at] = SPACE
      words[at + 2] = fg
    } else if (ch === UPPER && bg !== CLEAR) {
      words[at] = LOWER
      words[at + 1] = bg
      words[at + 2] = fg
    }
  }

  return encode(words)
}

// Da Mesa — Pure Node.js PNG icon generator (no npm deps)
// Uses only built-in 'zlib' and 'fs'
// Run: node generate-icons-pure.js

const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

const outDir = path.join(__dirname, 'assets', 'icons')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

// ── Colour palette ───────────────────────────────────────────────────
const BG    = [28,  22, 18]   // #1c1612 — near-black warm
const CREAM = [250, 247, 242] // #faf7f2
const RED   = [192, 57, 43]   // #c0392b
const GOLD  = [192, 155, 120] // warm gold

// ── PNG helpers ───────────────────────────────────────────────────────
function crc32(buf) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0)
  }
  return (c ^ 0xFFFFFFFF) >>> 0
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const crcBuf = Buffer.concat([typeBytes, data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(crcBuf))
  return Buffer.concat([len, typeBytes, data, crc])
}

function encodePNG(width, height, pixels) {
  // pixels: flat Uint8Array of RGBA, row-major
  const header = Buffer.from([137,80,78,71,13,10,26,10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 2 // bit depth 8, color type RGB (no alpha needed but let's do RGBA)
  ihdr[9] = 6 // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  // Build raw scanlines (filter byte 0 = None before each row)
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter type None
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4
      const dst = y * (stride + 1) + 1 + x * 4
      raw[dst]   = pixels[src]
      raw[dst+1] = pixels[src+1]
      raw[dst+2] = pixels[src+2]
      raw[dst+3] = pixels[src+3]
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 6 })
  return Buffer.concat([
    header,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ])
}

// ── Drawing helpers ──────────────────────────────────────────────────
function setPixel(pixels, width, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= width || y >= width) return
  const i = (y * width + x) * 4
  // Alpha blend over existing
  const sa = a / 255
  pixels[i]   = Math.round(pixels[i]   * (1-sa) + r * sa)
  pixels[i+1] = Math.round(pixels[i+1] * (1-sa) + g * sa)
  pixels[i+2] = Math.round(pixels[i+2] * (1-sa) + b * sa)
  pixels[i+3] = Math.min(255, pixels[i+3] + a)
}

function fillRect(pixels, w, x, y, rw, rh, r, g, b, a = 255) {
  for (let py = y; py < y + rh; py++)
    for (let px = x; px < x + rw; px++)
      setPixel(pixels, w, px, py, r, g, b, a)
}

function fillRoundedRect(pixels, w, x, y, rw, rh, radius, r, g, b, a = 255) {
  for (let py = y; py < y + rh; py++) {
    for (let px = x; px < x + rw; px++) {
      const dx = Math.min(px - x, x + rw - 1 - px)
      const dy = Math.min(py - y, y + rh - 1 - py)
      if (dx < radius && dy < radius) {
        const dist = Math.sqrt((radius-dx-1)**2 + (radius-dy-1)**2)
        if (dist > radius - 0.5) continue
        if (dist > radius - 1.5) {
          const aa = (radius - 0.5 - dist) * 255
          setPixel(pixels, w, px, py, r, g, b, Math.round(a * aa / 255))
          continue
        }
      }
      setPixel(pixels, w, px, py, r, g, b, a)
    }
  }
}

// Simple bitmap font — 5x7 pixels per char, just enough for "DM" style marks
// We'll draw large letters using a rasterised approach:
// Draw each letter as a series of rectangles (block letter style)
function drawLetter(pixels, W, char, x, y, scale, [r,g,b], alpha=255) {
  const s = scale
  const shapes = LETTERS[char] || []
  shapes.forEach(([cx, cy, cw, ch]) => {
    fillRect(pixels, W, x + cx*s, y + cy*s, cw*s, ch*s, r, g, b, alpha)
  })
}

// Block letter definitions [x, y, w, h] in units, each letter fits ~5x7 units
const LETTERS = {
  'D': [[0,0,1,7],[1,0,3,1],[1,6,3,1],[4,1,1,5]],
  'M': [[0,0,1,7],[1,1,1,1],[2,2,1,1],[3,1,1,1],[4,0,1,7]],
  'a': [[0,2,4,1],[0,4,4,1],[0,2,1,3],[3,2,1,3],[0,5,4,2]],
  'e': [[0,2,4,1],[0,2,1,5],[0,4,3,1],[0,6,4,1]],
  's': [[1,2,3,1],[0,3,1,1],[1,4,3,1],[3,5,1,1],[1,6,3,1]],
}

// ── Build icon ────────────────────────────────────────────────────────
function buildIcon(size) {
  const pixels = new Uint8Array(size * size * 4)

  // Start fully transparent
  pixels.fill(0)

  // Rounded background
  const rad = Math.round(size * 0.18)
  fillRoundedRect(pixels, size, 0, 0, size, size, rad, ...BG, 255)

  const pad = Math.round(size * 0.11)

  // "Da" text — top left, gold, small
  // Scale: letter unit = size * 0.055, so full letter height is 7 * scale
  const smallScale = Math.max(1, Math.round(size * 0.045))
  const smallAlpha = 160
  drawLetter(pixels, size, 'D', pad, pad, smallScale, GOLD, smallAlpha)
  drawLetter(pixels, size, 'a', pad + 6*smallScale, pad, smallScale, GOLD, smallAlpha)

  // Red accent line
  const lineY = Math.round(size * 0.42)
  const lineH = Math.max(2, Math.round(size * 0.03))
  const lineW = Math.round(size * 0.55)
  fillRect(pixels, size, pad, lineY, lineW, lineH, ...RED, 255)

  // "Mesa" — large, bottom area, cream
  const bigScale = Math.max(1, Math.round(size * 0.085))
  const bottomY = Math.round(size * 0.50)
  // M-e-s-a each ~5 units wide + 1 gap
  const letterSpacing = 6 * bigScale
  drawLetter(pixels, size, 'M', pad, bottomY, bigScale, CREAM, 245)
  drawLetter(pixels, size, 'e', pad + letterSpacing, bottomY, bigScale, CREAM, 245)
  drawLetter(pixels, size, 's', pad + letterSpacing*2, bottomY, bigScale, CREAM, 245)
  drawLetter(pixels, size, 'a', pad + letterSpacing*3, bottomY, bigScale, CREAM, 245)

  return pixels
}

// ── Generate all sizes ────────────────────────────────────────────────
const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

sizes.forEach(size => {
  const pixels = buildIcon(size)
  const png = encodePNG(size, size, pixels)
  const outPath = path.join(outDir, `icon-${size}.png`)
  fs.writeFileSync(outPath, png)
  console.log(`✅ icon-${size}.png — ${png.length} bytes`)
})

console.log('\n🎉 All icons generated in assets/icons/')

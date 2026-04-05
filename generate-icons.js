// Da Mesa — PWA icon generator
// Run: node generate-icons.js
// Requires: npm install canvas

const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const outDir = path.join(__dirname, 'assets', 'icons')

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

function drawIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background — warm cream / dark
  ctx.fillStyle = '#1c1612'
  ctx.beginPath()
  // Rounded rect
  const r = size * 0.18
  ctx.moveTo(r, 0)
  ctx.lineTo(size - r, 0)
  ctx.quadraticCurveTo(size, 0, size, r)
  ctx.lineTo(size, size - r)
  ctx.quadraticCurveTo(size, size, size - r, size)
  ctx.lineTo(r, size)
  ctx.quadraticCurveTo(0, size, 0, size - r)
  ctx.lineTo(0, r)
  ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.closePath()
  ctx.fill()

  // Draw "DM" monogram in Georgia serif, cream color
  const pad = size * 0.12
  const usable = size - pad * 2

  // "Da" — smaller, top-left area, muted
  ctx.fillStyle = 'rgba(192, 155, 120, 0.75)'
  ctx.font = `normal ${Math.round(usable * 0.28)}px Georgia, serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('Da', pad, pad)

  // "Mesa" — large, bold, cream white
  ctx.fillStyle = '#faf7f2'
  ctx.font = `bold ${Math.round(usable * 0.42)}px Georgia, serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'
  ctx.fillText('Mesa', pad, size - pad)

  // Accent line — red, horizontal
  const lineY = size * 0.595
  const lineX = pad
  const lineW = usable * 0.55
  const lineH = Math.max(2, Math.round(size * 0.018))
  ctx.fillStyle = '#c0392b'
  ctx.fillRect(lineX, lineY, lineW, lineH)

  return canvas
}

sizes.forEach(size => {
  const canvas = drawIcon(size)
  const buf = canvas.toBuffer('image/png')
  const outPath = path.join(outDir, `icon-${size}.png`)
  fs.writeFileSync(outPath, buf)
  console.log(`✅ icon-${size}.png (${buf.length} bytes)`)
})

console.log('\n🎉 All icons generated in assets/icons/')

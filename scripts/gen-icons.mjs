// One-off PNG icon generator (Phase 6). Renders the StyleAI mark — a white "S"
// on the brand background (#09090b) — into full-bleed PNGs for the PWA / iOS
// home screen. Pure Node (zlib), no image dependencies.
//
// Run: node scripts/gen-icons.mjs
// Outputs: public/icon-192.png, public/icon-512.png, public/apple-touch-icon.png

import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const BG = [0x09, 0x09, 0x0b] // #09090b
const FG = [0xff, 0xff, 0xff]

// 5x7 "S" glyph (1 = white).
const S = [
  '01110',
  '10001',
  '10000',
  '01110',
  '00001',
  '10001',
  '01110',
].map((r) => r.split('').map(Number))
const GW = 5
const GH = 7

function renderRGBA(size) {
  const buf = Buffer.alloc(size * size * 4)
  const cell = Math.floor((size * 0.52) / GH)
  const glyphW = GW * cell
  const glyphH = GH * cell
  const offX = Math.floor((size - glyphW) / 2)
  const offY = Math.floor((size - glyphH) / 2)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let color = BG
      const gx = Math.floor((x - offX) / cell)
      const gy = Math.floor((y - offY) / cell)
      if (gx >= 0 && gx < GW && gy >= 0 && gy < GH && S[gy][gx]) color = FG
      const i = (y * size + x) * 4
      buf[i] = color[0]
      buf[i + 1] = color[1]
      buf[i + 2] = color[2]
      buf[i + 3] = 0xff
    }
  }
  return buf
}

// --- minimal PNG encoder ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}
function encodePNG(size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  // raw with filter byte 0 per scanline
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = deflateSync(raw)
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

for (const [name, size] of [
  ['public/icon-192.png', 192],
  ['public/icon-512.png', 512],
  ['public/apple-touch-icon.png', 180],
]) {
  writeFileSync(name, encodePNG(size, renderRGBA(size)))
  console.log('wrote', name)
}

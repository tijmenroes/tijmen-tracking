import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(root, 'public')

const BRAND = '#7C3AED'

const brandSvg = (size, { rounded = true, fontScale = 0.32 } = {}) => {
  const radius = rounded ? Math.round(size * 0.19) : 0
  const fontSize = Math.round(size * fontScale)
  const y = Math.round(size / 2 + fontSize * 0.36)
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${BRAND}"/>
  <text x="${size / 2}" y="${y}" font-size="${fontSize}" font-weight="700" fill="#FFFFFF" text-anchor="middle" font-family="system-ui,sans-serif">TT</text>
</svg>`)
}

const icons = [
  ['icons/icon-192.png', 192],
  ['icons/icon-512.png', 512],
  // Android crops a maskable icon to its own shape, so it has to be full bleed —
  // a transparent margin shows up as a white ring around a small square. The
  // text stays well inside the 80% safe zone.
  ['icons/icon-512-maskable.png', 512, { rounded: false, fontScale: 0.26 }],
  // iOS rounds the corners itself and renders transparency as black.
  ['icons/apple-touch-icon.png', 180, { rounded: false }],
  ['favicon.png', 32],
]

await mkdir(join(publicDir, 'icons'), { recursive: true })

for (const [name, size, options = {}] of icons) {
  let image = sharp(brandSvg(size, options))
  if (options.rounded === false) image = image.flatten({ background: BRAND })
  await image.png().toFile(join(publicDir, name))
}

console.log('PWA icons generated in public/')

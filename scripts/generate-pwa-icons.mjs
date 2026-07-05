import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const iconsDir = join(root, 'public', 'icons')

const brandSvg = (size, inset = 0) => {
  const inner = size - inset * 2
  const radius = Math.round(inner * 0.19)
  const fontSize = Math.round(inner * (inset > 0 ? 0.28 : 0.32))
  const y = Math.round(size / 2 + fontSize * 0.36)
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect x="${inset}" y="${inset}" width="${inner}" height="${inner}" rx="${radius}" fill="#7C3AED"/>
  <text x="${size / 2}" y="${y}" font-size="${fontSize}" font-weight="700" fill="#FFFFFF" text-anchor="middle" font-family="system-ui,sans-serif">TT</text>
</svg>`)
}

await mkdir(iconsDir, { recursive: true })

const sizes = [
  ['icon-192.png', 192, 0],
  ['icon-512.png', 512, 0],
  ['icon-512-maskable.png', 512, Math.round(512 * 0.1)],
]

for (const [name, size, inset] of sizes) {
  await sharp(brandSvg(size, inset)).png().toFile(join(iconsDir, name))
}

await sharp(brandSvg(32)).png().toFile(join(root, 'public', 'favicon.png'))

console.log('PWA icons generated in public/icons/')

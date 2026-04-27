import { createHmac } from 'node:crypto'

const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function generateTotpCode(secret: string, forEpochMs = Date.now()) {
  const key = decodeBase32(secret)
  const counter = Math.floor(forEpochMs / 30_000)
  const buffer = Buffer.alloc(8)
  buffer.writeBigUInt64BE(BigInt(counter))

  const digest = createHmac('sha1', key).update(buffer).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary = (
    ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff)
  ) % 1_000_000

  return String(binary).padStart(6, '0')
}

function decodeBase32(input: string) {
  const normalized = input.toUpperCase().replace(/=+$/g, '').replace(/\s+/g, '')
  let bits = ''

  for (const char of normalized) {
    const index = base32Alphabet.indexOf(char)
    if (index < 0) {
      throw new Error(`非法的 Base32 字符: ${char}`)
    }
    bits += index.toString(2).padStart(5, '0')
  }

  const bytes: number[] = []
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2))
  }
  return Buffer.from(bytes)
}

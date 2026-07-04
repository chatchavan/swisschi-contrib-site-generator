// Minimal dependency-free ZIP writer (STORE method, no compression).
// Enough to package a deployable site folder entirely in the browser.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(bytes) {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function utf8(str) {
  return new TextEncoder().encode(str)
}

function base64ToBytes(b64) {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// entries: [{ name, bytes }] where bytes is a Uint8Array.
// Returns a Blob (application/zip).
function makeZip(entries, date = new Date()) {
  // DOS time/date
  const dosTime = ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((date.getSeconds() / 2) & 0x1f)
  const dosDate = (((date.getFullYear() - 1980) & 0x7f) << 9) | (((date.getMonth() + 1) & 0xf) << 5) | (date.getDate() & 0x1f)

  const chunks = []
  const central = []
  let offset = 0

  const u16 = (n) => new Uint8Array([n & 0xff, (n >>> 8) & 0xff])
  const u32 = (n) => new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff])

  for (const entry of entries) {
    const nameBytes = utf8(entry.name)
    const data = entry.bytes
    const crc = crc32(data)

    // Local file header
    const local = concat([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(dosTime), u16(dosDate),
      u32(crc), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0),
      nameBytes, data,
    ])
    chunks.push(local)

    // Central directory header
    central.push(concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(dosTime), u16(dosDate),
      u32(crc), u32(data.length), u32(data.length),
      u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset),
      nameBytes,
    ]))
    offset += local.length
  }

  const centralStart = offset
  let centralSize = 0
  for (const c of central) { chunks.push(c); centralSize += c.length }

  chunks.push(concat([
    u32(0x06054b50), u16(0), u16(0), u16(central.length), u16(central.length),
    u32(centralSize), u32(centralStart), u16(0),
  ]))

  return new Blob(chunks, { type: 'application/zip' })
}

function concat(arrays) {
  let len = 0
  for (const a of arrays) len += a.length
  const out = new Uint8Array(len)
  let pos = 0
  for (const a of arrays) { out.set(a, pos); pos += a.length }
  return out
}

import fs from 'fs';
import zlib from 'zlib';

function createCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

const crcTable = createCrcTable();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcData = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generatePng(size) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR: width (4), height (4), bit depth (1 = 8), color type (1 = 6 RGBA), comp (1 = 0), filter (1 = 0), interlace (1 = 0)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = makePngChunk('IHDR', ihdrData);

  // Scanlines: (1 + size * 4) * size bytes
  const rawData = Buffer.alloc((1 + size * 4) * size);
  const center = size / 2;
  const outerRadius = size * 0.46;
  const ringRadius = size * 0.35;
  const coreRadius = size * 0.22;
  const centerRadius = size * 0.08;

  let offset = 0;
  for (let y = 0; y < size; y++) {
    rawData[offset++] = 0; // Filter type 0 (None)
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let r = 2;   // #020617 (slate-950)
      let g = 6;
      let b = 23;
      let a = 255;

      if (dist <= outerRadius) {
        // Futuristic radial HUD glow
        const glowFactor = Math.max(0, 1 - dist / outerRadius);
        r = Math.min(255, Math.floor(2 + 20 * glowFactor));
        g = Math.min(255, Math.floor(6 + 70 * glowFactor));
        b = Math.min(255, Math.floor(23 + 120 * glowFactor));

        // Outer Ring
        if (Math.abs(dist - ringRadius) < size * 0.02) {
          r = 6;
          g = 182;
          b = 212; // Cyan 500
          a = 255;
        }

        // Mid Ring
        if (Math.abs(dist - ringRadius * 0.75) < size * 0.012) {
          r = 56;
          g = 189;
          b = 248; // Sky 400
          a = 255;
        }

        // Inner Core Glow
        if (dist <= coreRadius) {
          const coreFactor = 1 - dist / coreRadius;
          r = Math.min(255, Math.floor(6 + 180 * coreFactor));
          g = Math.min(255, Math.floor(182 + 73 * coreFactor));
          b = Math.min(255, Math.floor(212 + 43 * coreFactor));
        }

        // White-Hot Center
        if (dist <= centerRadius) {
          r = 255;
          g = 255;
          b = 255;
        }
      }

      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makePngChunk('IDAT', compressed);
  const iendChunk = makePngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

if (!fs.existsSync('./public')) {
  fs.mkdirSync('./public', { recursive: true });
}

fs.writeFileSync('./public/pwa-192x192.png', generatePng(192));
fs.writeFileSync('./public/pwa-512x512.png', generatePng(512));
fs.writeFileSync('./public/pwa-maskable-512x512.png', generatePng(512));
fs.writeFileSync('./public/apple-touch-icon.png', generatePng(180));
console.log('Successfully generated PWA icons in /public!');

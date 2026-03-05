/**
 * Генерирует минимальный 16x16 favicon.ico (тёмный квадрат — бренд FreeTips).
 * Запуск: node scripts/gen-favicon.js
 */
const fs = require("fs");
const path = require("path");

// ICO: header 6 + dir entry 16 = 22, then BMP (40 header + 16*16*4 pixels)
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);

const entry = Buffer.alloc(16);
entry[0] = 16;   // width
entry[1] = 16;   // height
entry[2] = 0;
entry[3] = 0;
entry.writeUInt16LE(1, 4);   // planes
entry.writeUInt16LE(32, 6);  // bpp
const imageSize = 40 + 16 * 16 * 4;  // BITMAPINFOHEADER + pixels
entry.writeUInt32LE(imageSize, 8);
entry.writeUInt32LE(22, 12);  // offset to image

// BITMAPINFOHEADER 40 bytes
const dib = Buffer.alloc(40);
dib.writeUInt32LE(40, 0);           // header size
dib.writeInt32LE(16, 4);            // width
dib.writeInt32LE(32, 8);            // height (2*16 for XOR+AND)
dib.writeUInt16LE(1, 12);           // planes
dib.writeUInt16LE(32, 14);         // bpp
dib.writeUInt32LE(0, 16);           // compression
dib.writeUInt32LE(16 * 16 * 4, 20); // image size
dib.writeInt32LE(0, 24);
dib.writeInt32LE(0, 28);
dib.writeUInt32LE(0, 32);
dib.writeUInt32LE(0, 36);

// 16x16 RGBA: navy #1e293b, opaque. Rows bottom-up, 4 bytes per pixel.
const pixels = Buffer.alloc(16 * 16 * 4);
const r = 0x1e, g = 0x29, b = 0x3b, a = 255;
for (let i = 0; i < 16 * 16 * 4; i += 4) {
  pixels[i] = b;
  pixels[i + 1] = g;
  pixels[i + 2] = r;
  pixels[i + 3] = a;
}

const outPath = path.join(__dirname, "..", "public", "favicon.ico");
const ico = Buffer.concat([header, entry, dib, pixels]);
fs.writeFileSync(outPath, ico);
console.log("Written:", outPath, ico.length, "bytes");

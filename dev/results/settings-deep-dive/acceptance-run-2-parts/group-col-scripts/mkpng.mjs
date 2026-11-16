import zlib from "zlib"; import fs from "fs";
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (b) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
export function png(w, h, rgb = [200, 60, 60]) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = rgb[0]; raw[o + 1] = rgb[1]; raw[o + 2] = rgb[2]; } }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const d = new URL("./files/", import.meta.url).pathname;
fs.writeFileSync(d + "fav-64x64.png", png(64, 64, [30, 90, 200]));
fs.writeFileSync(d + "wide-600x300.png", png(600, 300, [200, 120, 30]));
fs.writeFileSync(d + "tiny-10x10.png", png(10, 10, [20, 160, 80]));
fs.writeFileSync(d + "fav-128x128.png", png(128, 128, [160, 30, 160]));
fs.writeFileSync(d + "big-1024x1024.png", png(1024, 1024, [90, 90, 90]));
fs.writeFileSync(d + "notes.txt", "not an image\n");
fs.writeFileSync(d + "broken.png", "this is text pretending to be a png");
// 512x512 16-bit RGBA noise, > 2 MiB on disk, dimensions valid for the favicon rule
{
  const w = 512, h = 512, bpp = 8;
  const raw = Buffer.alloc((w * bpp + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * bpp + 1)] = 0; for (let i = 0; i < w * bpp; i++) raw[y * (w * bpp + 1) + 1 + i] = Math.floor(Math.random() * 256); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 16; ih[9] = 6;
  fs.writeFileSync(d + "heavy-512x512.png", Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", zlib.deflateSync(raw, { level: 1 })), chunk("IEND", Buffer.alloc(0))]));
}

const DEFAULT_MIN_CODE_SIZE = 8;

const DEFAULT_PALETTE = createPalette332();

interface GifEncoderOptions {
  width: number;
  height: number;
  loop?: number;
}

function createPalette332(): Uint8Array {
  const palette = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const r = (i >> 5) & 0x07;
    const g = (i >> 2) & 0x07;
    const b = i & 0x03;
    palette[i * 3] = Math.round((r * 255) / 7);
    palette[i * 3 + 1] = Math.round((g * 255) / 7);
    palette[i * 3 + 2] = Math.round((b * 255) / 3);
  }
  return palette;
}

function mapToPaletteIndices(data: Uint8ClampedArray): Uint8Array {
  const length = data.length / 4;
  const indices = new Uint8Array(length);
  let offset = 0;
  for (let i = 0; i < length; i++) {
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const r3 = r >> 5;
    const g3 = g >> 5;
    const b2 = b >> 6;
    indices[i] = (r3 << 5) | (g3 << 2) | b2;
    offset += 4;
  }
  return indices;
}

function lzwEncode(minCodeSize: number, indices: Uint8Array): Uint8Array {
  if (indices.length === 0) {
    return new Uint8Array();
  }

  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = endCode + 1;
  let dictionary = new Map<string, number>();

  const output: number[] = [];
  let bitBuffer = 0;
  let bitCount = 0;

  const writeCode = (code: number) => {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      output.push(bitBuffer & 0xff);
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  };

  writeCode(clearCode);
  let prefix = indices[0];

  for (let i = 1; i < indices.length; i++) {
    const c = indices[i];
    const key = `${prefix},${c}`;
    const existing = dictionary.get(key);
    if (existing !== undefined) {
      prefix = existing;
      continue;
    }

    writeCode(prefix);

    if (nextCode < 4096) {
      dictionary.set(key, nextCode++);
      if (nextCode === (1 << codeSize) && codeSize < 12) {
        codeSize++;
      }
    } else {
      writeCode(clearCode);
      dictionary = new Map<string, number>();
      codeSize = minCodeSize + 1;
      nextCode = endCode + 1;
    }

    prefix = c;
  }

  writeCode(prefix);
  writeCode(endCode);

  if (bitCount > 0) {
    output.push(bitBuffer & 0xff);
  }

  return new Uint8Array(output);
}

export class GifEncoder {
  private width: number;
  private height: number;
  private loop: number;
  private bytes: number[] = [];
  private started = false;

  constructor(options: GifEncoderOptions) {
    this.width = options.width;
    this.height = options.height;
    this.loop = options.loop ?? 0;
  }

  addFrame(imageData: ImageData, delayMs: number): void {
    this.ensureHeader();

    const delay = Math.max(1, Math.round(delayMs / 10));

    // Graphics Control Extension
    this.bytes.push(0x21, 0xf9, 0x04, 0x00);
    this.writeUInt16(delay);
    this.bytes.push(0x00, 0x00);

    // Image Descriptor
    this.bytes.push(0x2c);
    this.writeUInt16(0);
    this.writeUInt16(0);
    this.writeUInt16(this.width);
    this.writeUInt16(this.height);
    this.bytes.push(0x00);

    const indices = mapToPaletteIndices(imageData.data);
    const lzwData = lzwEncode(DEFAULT_MIN_CODE_SIZE, indices);

    this.bytes.push(DEFAULT_MIN_CODE_SIZE);
    this.writeSubBlocks(lzwData);
  }

  finish(): Uint8Array {
    this.ensureHeader();
    this.bytes.push(0x3b);
    return new Uint8Array(this.bytes);
  }

  private ensureHeader(): void {
    if (this.started) return;
    this.started = true;

    this.writeString('GIF89a');
    this.writeUInt16(this.width);
    this.writeUInt16(this.height);
    this.bytes.push(0xf7, 0x00, 0x00);
    this.bytes.push(...DEFAULT_PALETTE);

    // Netscape loop extension
    this.bytes.push(0x21, 0xff, 0x0b);
    this.writeString('NETSCAPE2.0');
    this.bytes.push(0x03, 0x01);
    this.writeUInt16(this.loop);
    this.bytes.push(0x00);
  }

  private writeUInt16(value: number): void {
    this.bytes.push(value & 0xff, (value >> 8) & 0xff);
  }

  private writeString(value: string): void {
    for (let i = 0; i < value.length; i++) {
      this.bytes.push(value.charCodeAt(i));
    }
  }

  private writeSubBlocks(data: Uint8Array): void {
    let offset = 0;
    while (offset < data.length) {
      const blockSize = Math.min(255, data.length - offset);
      this.bytes.push(blockSize);
      for (let i = 0; i < blockSize; i++) {
        this.bytes.push(data[offset + i]);
      }
      offset += blockSize;
    }
    this.bytes.push(0x00);
  }
}

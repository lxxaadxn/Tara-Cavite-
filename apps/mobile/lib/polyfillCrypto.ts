import 'react-native-get-random-values';

type SubtleDigest = {
  digest: (
    algorithm: AlgorithmIdentifier | { name: string },
    data: BufferSource
  ) => Promise<ArrayBuffer>;
};

function ensureBtoa() {
  const g = globalThis as typeof globalThis & { btoa?: (s: string) => string };
  if (typeof g.btoa === 'function') return;
  g.btoa = (input: string) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    const str = String(input);
    let out = '';
    for (let i = 0; i < str.length; i += 3) {
      const a = str.charCodeAt(i);
      const b = i + 1 < str.length ? str.charCodeAt(i + 1) : NaN;
      const c = i + 2 < str.length ? str.charCodeAt(i + 2) : NaN;
      const bitmap = (a << 16) | ((Number.isNaN(b) ? 0 : b) << 8) | (Number.isNaN(c) ? 0 : c);
      out += chars.charAt((bitmap >> 18) & 63);
      out += chars.charAt((bitmap >> 12) & 63);
      out += Number.isNaN(b) ? '=' : chars.charAt((bitmap >> 6) & 63);
      out += Number.isNaN(c) ? '=' : chars.charAt(bitmap & 63);
    }
    return out;
  };
}

function sha256(bytes: Uint8Array): ArrayBuffer {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n));
  const bitLen = bytes.length * 8;
  const withPad = new Uint8Array(((bytes.length + 9 + 63) & ~63) >>> 0);
  withPad.set(bytes);
  withPad[bytes.length] = 0x80;
  const view = new DataView(withPad.buffer);
  view.setUint32(withPad.length - 4, bitLen >>> 0, false);
  // high 32 bits of length (always 0 for messages we use)
  view.setUint32(withPad.length - 8, 0, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);
  for (let i = 0; i < withPad.length; i += 64) {
    for (let j = 0; j < 16; j++) w[j] = view.getUint32(i + j * 4, false);
    for (let j = 16; j < 64; j++) {
      const s0 = rotr(7, w[j - 15]) ^ rotr(18, w[j - 15]) ^ (w[j - 15] >>> 3);
      const s1 = rotr(17, w[j - 2]) ^ rotr(19, w[j - 2]) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;
    for (let j = 0; j < 64; j++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[j] + w[j]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new ArrayBuffer(32);
  const outView = new DataView(out);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  outView.setUint32(20, h5, false);
  outView.setUint32(24, h6, false);
  outView.setUint32(28, h7, false);
  return out;
}

function toBytes(data: BufferSource): Uint8Array {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (data instanceof Uint8Array) return data;
  return new Uint8Array(
    (data as ArrayBufferView).buffer,
    (data as ArrayBufferView).byteOffset,
    (data as ArrayBufferView).byteLength
  );
}

function ensureCrypto() {
  ensureBtoa();
  const g = globalThis as typeof globalThis & { crypto?: Crypto & { subtle?: SubtleDigest } };
  const prev = g.crypto;
  if (typeof prev?.subtle?.digest === 'function' && typeof prev.getRandomValues === 'function') {
    return;
  }

  const getRandomValues =
    typeof prev?.getRandomValues === 'function'
      ? prev.getRandomValues.bind(prev)
      : (globalThis.crypto as Crypto | undefined)?.getRandomValues?.bind(globalThis.crypto);

  if (typeof getRandomValues !== 'function') {
    throw new Error('crypto.getRandomValues is unavailable');
  }

  const subtle: SubtleDigest = {
    async digest(algorithm, data) {
      const name =
        typeof algorithm === 'string'
          ? algorithm
          : algorithm && typeof algorithm === 'object' && 'name' in algorithm
            ? String(algorithm.name)
            : '';
      if (!/sha-?256/i.test(name)) throw new Error(`Unsupported digest: ${name || 'unknown'}`);
      return sha256(toBytes(data));
    },
  };

  const stub = {
    getRandomValues,
    subtle,
    randomUUID:
      typeof prev?.randomUUID === 'function'
        ? prev.randomUUID.bind(prev)
        : () => {
            const b = new Uint8Array(16);
            getRandomValues(b);
            b[6] = (b[6] & 0x0f) | 0x40;
            b[8] = (b[8] & 0x3f) | 0x80;
            const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
            return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
          },
  } as Crypto & { subtle: SubtleDigest };

  try {
    g.crypto = stub;
  } catch {
    try {
      Object.defineProperty(g, 'crypto', { value: stub, configurable: true, writable: true });
    } catch {
      if (prev) {
        try {
          (prev as { subtle: SubtleDigest }).subtle = subtle;
        } catch {
        }
      }
    }
  }
  try {
    (globalThis as typeof globalThis & { crypto?: Crypto }).crypto = stub;
  } catch {
  }
}

ensureCrypto();

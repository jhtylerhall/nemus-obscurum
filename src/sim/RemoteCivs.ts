export type RemoteCiv = {
  id: string;
  seed: string;
  disposition: 'ally' | 'neutral' | 'hostile';
};

export class RemoteCivGenerator {
  public constructor(private readonly seed: string) {}

  public make(index: number): RemoteCiv {
    const digest = this.hash(`${this.seed}-${index}`);
    const mood = parseInt(digest.slice(0, 2), 16) / 255;
    let disposition: RemoteCiv['disposition'] = 'neutral';
    if (mood > 0.66) disposition = 'ally';
    else if (mood < 0.33) disposition = 'hostile';
    return {
      id: digest.slice(0, 12),
      seed: digest,
      disposition,
    };
  }

  private hash(input: string): string {
    let h1 = 0xdeadbeef ^ input.length;
    let h2 = 0x41c6ce57 ^ input.length;
    for (let i = 0; i < input.length; i += 1) {
      const ch = input.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const hash = (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
    return hash.repeat(4).slice(0, 64);
  }
}

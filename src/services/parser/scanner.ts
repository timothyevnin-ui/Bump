/**
 * A tiny lexer helper: lets each parsing rule claim a span of the input so
 * later rules (and the title extractor) never see text that has already been
 * interpreted. Keeps the rules order-dependent but mutually non-destructive.
 */
export class Scanner {
  readonly source: string;
  readonly lower: string;
  private readonly claimed: boolean[];

  constructor(source: string) {
    this.source = source;
    this.lower = source.toLowerCase();
    this.claimed = new Array(source.length).fill(false);
  }

  private isFree(start: number, end: number): boolean {
    for (let i = start; i < end; i += 1) {
      if (this.claimed[i]) return false;
    }
    return true;
  }

  /** First match of `pattern` that does not overlap an already-claimed span. */
  find(pattern: RegExp): RegExpExecArray | null {
    const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
    let match = re.exec(this.lower);
    while (match) {
      if (this.isFree(match.index, match.index + match[0].length)) return match;
      match = re.exec(this.lower);
    }
    return null;
  }

  /** Claims the span a `find` result covers. */
  claim(match: RegExpExecArray) {
    for (let i = match.index; i < match.index + match[0].length; i += 1) {
      this.claimed[i] = true;
    }
  }

  /** Convenience: find and immediately claim. */
  consume(pattern: RegExp): RegExpExecArray | null {
    const match = this.find(pattern);
    if (match) this.claim(match);
    return match;
  }

  /** Everything the rules did not claim, in the original casing. */
  remainder(): string {
    let out = '';
    for (let i = 0; i < this.source.length; i += 1) {
      out += this.claimed[i] ? ' ' : this.source[i];
    }
    return out;
  }
}

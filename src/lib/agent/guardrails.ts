/**
 * AI panel guardrails (CLAUDE.md, "AI panel guardrails (HARD)").
 *
 * Any AI-generated output must NOT contain:
 *   buy · sell · guaranteed · guarantee · safe bet · sure thing
 *   win · profit · "you should"
 *
 * This module throws on a violation so banned phrasing never reaches the UI.
 * It is also asserted in tests for defense in depth.
 */

const BANNED_WORD_PATTERNS: readonly RegExp[] = [
  /\bbuy(s|ing|er)?\b/i,
  /\bsell(s|ing|er)?\b/i,
  /\bguarantee(d|s)?\b/i,
  /\bwin(s|ning|ner)?\b/i,
  /\bprofit(s|able|ability)?\b/i,
];

const BANNED_PHRASES: readonly string[] = [
  "safe bet",
  "sure thing",
  "you should",
];

export class BannedTermError extends Error {
  constructor(term: string, context: string) {
    super(`${context} contains banned term: "${term}"`);
    this.name = "BannedTermError";
  }
}

export function assertNoBannedWords(text: string, context = "AI output"): void {
  for (const pattern of BANNED_WORD_PATTERNS) {
    const match = pattern.exec(text);
    if (match) throw new BannedTermError(match[0], context);
  }
  const lower = text.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) throw new BannedTermError(phrase, context);
  }
}

export function containsBannedTerm(text: string): boolean {
  try {
    assertNoBannedWords(text);
    return false;
  } catch {
    return true;
  }
}

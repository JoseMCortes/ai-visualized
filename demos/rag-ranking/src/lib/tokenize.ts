/** Lowercase word tokens, with a small stop-word list — function words carry no ranking signal. */

const STOPWORDS = new Set(
  (
    'a an the this that these those is am are was were be been being do does did ' +
    'and or but nor so for if then than as of in on at by with from into onto over ' +
    'under to too also very its it their her his our your my ' +
    'not no all any each every one first before long during'
  ).split(/\s+/),
);

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z]+/g) ?? []).filter(
    (w) => w.length > 1 && !STOPWORDS.has(w),
  );
}

/** Adjacent-pair (bigram) view of a token list, used for phrase-overlap features. */
export function bigrams(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) out.push(`${tokens[i]} ${tokens[i + 1]}`);
  return out;
}

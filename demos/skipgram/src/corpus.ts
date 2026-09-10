/**
 * A tiny, telegraphic corpus — no articles or filler, just content words, so
 * every visible word is a real token the algorithm trains on. It is small and
 * very repetitive on purpose: ~26 words, each seen several times, in three
 * topics (animals · food · court) that share almost no context. That is enough
 * signal for skip-gram to pull them into three groups in a few hundred steps.
 */

export const SENTENCES: string[] = [
  // animals
  'dog runs',
  'dog sleeps',
  'cat runs',
  'cat sleeps',
  'dog cat play',
  'cat chases mouse',
  'dog chases cat',
  'mouse runs hides',
  'lion hunts deer',
  'wolf hunts deer',
  'lion chases deer',
  'deer runs',
  'lion big cat',
  'wolf wild dog',

  // food
  'eat bread',
  'eat cheese',
  'drink wine',
  'drink milk',
  'bread cheese',
  'cheese wine',
  'bread milk',
  'bake bread',
  'cheese from milk',

  // court
  'king wears crown',
  'queen wears crown',
  'king sits throne',
  'queen sits throne',
  'king rules castle',
  'queen lives castle',
  'prince becomes king',
  'crown throne castle',
  'king queen throne',
];

/** Split a sentence into lowercase word tokens (letters only). */
export function tokenize(sentence: string): string[] {
  return sentence.toLowerCase().match(/[a-z]+/g) ?? [];
}

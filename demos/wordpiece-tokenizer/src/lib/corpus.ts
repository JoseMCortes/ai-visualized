/**
 * A small, morphology-rich word list — chosen so the merges WordPiece finds
 * are ones you'd recognize (roots like "play"/"run"/"help", suffixes like
 * "-ing"/"-ness"/"-er", prefixes like "un-"/"re-"), not just noise. Counts
 * stand in for how often each word appears in a training corpus.
 */

export const CORPUS: { word: string; count: number }[] = [
  { word: 'play', count: 5 },
  { word: 'plays', count: 2 },
  { word: 'playing', count: 4 },
  { word: 'played', count: 3 },
  { word: 'player', count: 3 },
  { word: 'players', count: 2 },
  { word: 'unplayed', count: 1 },
  { word: 'replay', count: 2 },
  { word: 'happy', count: 4 },
  { word: 'happiness', count: 2 },
  { word: 'unhappy', count: 2 },
  { word: 'happily', count: 2 },
  { word: 'unhappiness', count: 1 },
  { word: 'run', count: 4 },
  { word: 'runs', count: 2 },
  { word: 'running', count: 4 },
  { word: 'runner', count: 2 },
  { word: 'runners', count: 1 },
  { word: 'rerun', count: 1 },
  { word: 'teach', count: 3 },
  { word: 'teaches', count: 1 },
  { word: 'teacher', count: 3 },
  { word: 'teachers', count: 2 },
  { word: 'teaching', count: 2 },
  { word: 'build', count: 3 },
  { word: 'builds', count: 1 },
  { word: 'builder', count: 2 },
  { word: 'builders', count: 1 },
  { word: 'building', count: 3 },
  { word: 'rebuild', count: 1 },
  { word: 'rebuilding', count: 1 },
  { word: 'help', count: 4 },
  { word: 'helps', count: 1 },
  { word: 'helper', count: 2 },
  { word: 'helping', count: 2 },
  { word: 'helpful', count: 2 },
  { word: 'unhelpful', count: 1 },
  { word: 'helpless', count: 1 },
  { word: 'kind', count: 3 },
  { word: 'kindness', count: 2 },
  { word: 'kindly', count: 2 },
  { word: 'unkind', count: 1 },
  { word: 'use', count: 4 },
  { word: 'uses', count: 1 },
  { word: 'user', count: 3 },
  { word: 'users', count: 2 },
  { word: 'useful', count: 2 },
  { word: 'useless', count: 1 },
  { word: 'reuse', count: 1 },
  { word: 'work', count: 4 },
  { word: 'works', count: 2 },
  { word: 'worker', count: 3 },
  { word: 'workers', count: 2 },
  { word: 'working', count: 3 },
  { word: 'rework', count: 1 },
];

/**
 * Words to keep an eye on while training. The in-corpus ones show their
 * *actual* split as it's merged — that's the training process itself, not
 * a simulation of it. The held-out ones were never in the training data at
 * all; they're run through the current (possibly still-tiny) vocabulary as
 * genuine inference, exactly like the playground box below does for
 * whatever you type — worth keeping separate so it's clear which is which.
 */
export const IN_CORPUS_WATCH_WORDS = ['unhappiness', 'workers'];
export const HELD_OUT_WATCH_WORDS = ['replaying', 'unbelievable'];

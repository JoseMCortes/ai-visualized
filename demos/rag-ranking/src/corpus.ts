/**
 * A small, fixed document set (18 short "articles", six topics) and four
 * example queries, each picked to make the ranking methods disagree in an
 * instructive way. Every (query, document) relevance grade below is authored
 * by hand — there is no real judged dataset — so the demo can show a "ground
 * truth" badge and let you see how close each method gets to it.
 */

export interface Doc {
  id: string;
  topic: string;
  title: string;
  text: string;
}

export const DOCS: Doc[] = [
  // space
  {
    id: 'S1',
    topic: 'space',
    title: 'Mars rovers',
    text: 'Mars rovers use solar panels and a nuclear battery to power their instruments during long missions.',
  },
  {
    id: 'S2',
    topic: 'space',
    title: 'Space telescopes',
    text: 'The James Webb Space Telescope observes infrared light to study distant galaxies and early stars.',
  },
  {
    id: 'S3',
    topic: 'space',
    title: 'Space station',
    text: 'Astronauts aboard the International Space Station conduct experiments in microgravity.',
  },
  // cooking
  {
    id: 'C1',
    topic: 'cooking',
    title: 'Sourdough bread',
    text: 'A classic sourdough bread needs an active starter, patience, and a hot oven for a crisp crust.',
  },
  {
    id: 'C2',
    topic: 'cooking',
    title: 'Searing steak',
    text: 'Searing a steak in a hot pan before finishing it in the oven creates a flavorful crust.',
  },
  {
    id: 'C3',
    topic: 'cooking',
    title: 'Pesto sauce',
    text: 'Fresh basil, garlic, and olive oil are blended together to make a simple pesto sauce.',
  },
  // programming
  {
    id: 'P1',
    topic: 'programming',
    title: 'Fixing bugs',
    text: 'Fixing a bug often starts with reproducing the failure and reading the stack trace carefully.',
  },
  {
    id: 'P2',
    topic: 'programming',
    title: 'Version control',
    text: 'Version control lets a team track changes to source code and revert mistakes easily.',
  },
  {
    id: 'P3',
    topic: 'programming',
    title: 'Unit tests',
    text: 'Unit tests catch a regression early, long before a defect reaches production users.',
  },
  // cars
  {
    id: 'A1',
    topic: 'cars',
    title: 'Electric vehicles',
    text: 'Electric vehicles use a large battery pack and an electric motor instead of a combustion engine.',
  },
  {
    id: 'A2',
    topic: 'cars',
    title: 'Engine maintenance',
    text: 'Regular oil changes keep a gasoline engine and its moving parts lubricated and reduce wear.',
  },
  {
    id: 'A3',
    topic: 'cars',
    title: 'Car software',
    text: 'A car onboard computer manages fuel injection, braking assistance, and the dashboard display.',
  },
  // health
  {
    id: 'H1',
    topic: 'health',
    title: 'Aerobic exercise',
    text: 'Regular aerobic exercise strengthens the heart and improves circulation over time.',
  },
  {
    id: 'H2',
    topic: 'health',
    title: 'Balanced diet',
    text: 'A balanced diet with vegetables, protein, and whole grains supports long term health.',
  },
  {
    id: 'H3',
    topic: 'health',
    title: 'Sleep and recovery',
    text: 'Getting enough sleep each night helps the body recover and the mind stay focused.',
  },
  // music
  {
    id: 'M1',
    topic: 'music',
    title: 'Orchestra sections',
    text: 'A symphony orchestra combines strings, brass, woodwinds, and percussion sections.',
  },
  {
    id: 'M2',
    topic: 'music',
    title: 'Learning guitar',
    text: 'Learning guitar chords is one of the first steps for a beginner songwriter.',
  },
  {
    id: 'M3',
    topic: 'music',
    title: 'Concert acoustics',
    text: 'Concert halls are designed with acoustics in mind to carry sound evenly to every seat.',
  },
];

export interface QueryDef {
  id: string;
  text: string;
  /** one-sentence label shown next to the query, saying what it's designed to demonstrate */
  lesson: string;
}

export const QUERIES: QueryDef[] = [
  {
    id: 'q_baseline',
    text: 'sourdough bread crust',
    lesson:
      'Baseline: the words in the query and the right document match exactly — every method should agree.',
  },
  {
    id: 'q_paraphrase',
    text: 'resolving defects in the code',
    lesson:
      'Paraphrase: shares almost no exact words with the most relevant document — a real test for word-matching methods.',
  },
  {
    id: 'q_collision',
    text: 'battery power',
    lesson:
      '"Battery" shows up in two unrelated topics (a Mars rover and an electric car) — watch how each method handles the ambiguity.',
  },
  {
    id: 'q_multi',
    text: 'exercise, diet, and sleep',
    lesson:
      'Several documents are all somewhat relevant — the interesting question becomes the order, not just a yes/no match.',
  },
];

/**
 * Extra short sentences used only to train the embeddings (mini-embeddings.ts),
 * not part of the searchable document set. A real embedding model is
 * pretrained on far more text than the documents you later search over; this
 * gives the tiny in-browser model the same kind of head start, honestly, on a
 * larger but still small background text — in particular, enough programming
 * vocabulary for "resolving", "defect", "bug" and "fixing" to end up in
 * similar territory even though the query and its best document, below,
 * share almost no words in common.
 */
export const EMBEDDING_BACKGROUND: string[] = [
  'Engineers on Earth send commands to remote spacecraft exploring the outer planets.',
  'A rocket launch requires enormous amounts of fuel to reach orbit.',
  'Satellites orbiting Earth relay communication signals and weather data.',
  'A recipe usually lists the ingredients first and the cooking steps second.',
  'Bakers knead dough to develop gluten before it is left to rise.',
  'Grilling vegetables brings out a smoky, caramelized flavor.',
  'A software error is often called a bug, and fixing the bug is called a patch.',
  'Developers debug a program by resolving each bug they find in the code.',
  'An issue tracker helps a team record, discuss, and resolve a software defect or bug.',
  'Refactoring code makes a program easier to maintain without changing what it does.',
  'A mechanic inspects the brakes and tires during a routine service.',
  'Hybrid vehicles combine a small engine with an electric motor for better efficiency.',
  'A charging station can refill an electric car battery in under an hour.',
  'Doctors recommend regular checkups to catch health problems early.',
  'Stretching before a workout can help prevent a muscle injury.',
  'Drinking enough water throughout the day supports the body normal functions.',
  'A conductor keeps the orchestra playing in time and in tune.',
  'Practicing scales daily builds finger strength and muscle memory.',
  'Streaming services have changed how people discover and listen to new music.',
];

/**
 * Hand-authored relevance grades, 0 (not relevant) to 3 (highly relevant).
 * This is the "ground truth" the demo compares every method against, and the
 * labeled data the two trained methods (cross-encoder, learning to rank)
 * learn from. Any (query, doc) pair not listed is grade 0.
 */
export const RELEVANCE: Record<string, Record<string, number>> = {
  q_baseline: { C1: 3, C2: 1 },
  q_paraphrase: { P1: 3, P3: 2, P2: 1 },
  q_collision: { A1: 3, S1: 1 },
  q_multi: { H1: 3, H2: 3, H3: 2 },
};

export function relevanceOf(queryId: string, docId: string): number {
  return RELEVANCE[queryId]?.[docId] ?? 0;
}

export function queryById(id: string): QueryDef {
  const q = QUERIES.find((x) => x.id === id);
  if (!q) throw new Error(`unknown query ${id}`);
  return q;
}

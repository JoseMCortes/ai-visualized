/**
 * Precomputes everything the rest of the demo needs exactly once: the corpus
 * statistics, the trained mini-embeddings, and — for every (query, document)
 * pair — the BM25 and cosine scores (raw and normalised) plus the cross
 * features. The two trained methods (cross-encoder toy, learning to rank)
 * are trained directly off this table.
 */

import { DOCS, QUERIES, relevanceOf, type Doc, type QueryDef } from '../corpus';
import { bm25Score } from './bm25';
import { buildFeatures, type FeatureVector } from './features';
import { hybridScores } from './hybrid';
import { cosineBreakdown, trainOnCorpus, type MiniEmbeddings } from './miniEmbeddings';
import { buildCorpus, type Corpus } from './textstats';

export interface PairStats {
  queryId: string;
  docId: string;
  bm25: number;
  bm25Norm: number;
  cosine: number;
  cosineNorm: number;
  features: FeatureVector;
  relevance: number;
}

export interface Dataset {
  corpus: Corpus;
  embeddings: MiniEmbeddings;
  docs: Doc[];
  queries: QueryDef[];
  /** queryId -> docId -> stats */
  pairs: Map<string, Map<string, PairStats>>;
  pairList: PairStats[];
}

function minMax(values: number[]): (v: number) => number {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo;
  return (v) => (span > 1e-9 ? (v - lo) / span : 0.5);
}

export function buildDataset(): Dataset {
  const corpus = buildCorpus(DOCS);
  const embeddings = trainOnCorpus(DOCS);
  const pairs = new Map<string, Map<string, PairStats>>();
  const pairList: PairStats[] = [];

  for (const q of QUERIES) {
    const qVec = embeddings.bagVector(q.text);
    const raw = DOCS.map((d) => ({
      docId: d.id,
      bm25: bm25Score(corpus, q.text, d.id),
      cosine: cosineBreakdown(qVec, embeddings.bagVector(d.text)).cosine,
    }));
    const normBm25 = minMax(raw.map((r) => r.bm25));
    const normCos = minMax(raw.map((r) => r.cosine));

    const byDoc = new Map<string, PairStats>();
    for (const r of raw) {
      const doc = DOCS.find((d) => d.id === r.docId)!;
      const bm25Norm = normBm25(r.bm25);
      const cosineNorm = normCos(r.cosine);
      const stats: PairStats = {
        queryId: q.id,
        docId: r.docId,
        bm25: r.bm25,
        bm25Norm,
        cosine: r.cosine,
        cosineNorm,
        features: buildFeatures(q.text, doc.text, bm25Norm, cosineNorm),
        relevance: relevanceOf(q.id, r.docId),
      };
      byDoc.set(r.docId, stats);
      pairList.push(stats);
    }
    pairs.set(q.id, byDoc);
  }

  return { corpus, embeddings, docs: DOCS, queries: QUERIES, pairs, pairList };
}

export function statsFor(ds: Dataset, queryId: string, docId: string): PairStats {
  const s = ds.pairs.get(queryId)?.get(docId);
  if (!s) throw new Error(`no stats for ${queryId}/${docId}`);
  return s;
}

/** Convenience: the hybrid-blended rows for one query, at a given alpha. */
export function hybridForQuery(ds: Dataset, queryId: string, alpha: number) {
  const rows = [...ds.pairs.get(queryId)!.values()].map((s) => ({
    docId: s.docId,
    bm25: s.bm25,
    cosine: s.cosine,
  }));
  return hybridScores(rows, alpha);
}

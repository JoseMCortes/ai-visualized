/**
 * The idiomatic, one-line way to run this whole pipeline with LCEL:
 *
 *   const chain = prompt.pipe(model).pipe(outputParser);
 *   const result = await chain.invoke({ reviewText, formatInstructions });
 *
 * That's the code shown in the panel above the pipeline diagram. This
 * function does the same three steps — format, call the model, parse — but
 * one at a time, so the UI can update between each and show what's inside
 * every stage instead of only the final answer. Nothing about the request
 * that actually goes over the wire differs from the one-liner above.
 */

import { formatPrompt, parseResponse } from './prompt';
import { callModel, type ModelConfig } from './models';
import type { ReviewExtraction } from './schema';

export interface ChainRunResult {
  formattedPrompt: { role: string; content: string }[];
  rawResponse: string;
  parsed: ReviewExtraction | null;
  parseError: string | null;
}

export async function runChain(reviewText: string, cfg: ModelConfig): Promise<ChainRunResult> {
  const formattedPrompt = await formatPrompt(reviewText);
  const rawResponse = await callModel(reviewText, cfg);
  const { parsed, parseError } = await parseResponse(rawResponse);
  return { formattedPrompt, rawResponse, parsed, parseError };
}

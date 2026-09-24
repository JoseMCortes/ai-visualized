/**
 * The two pieces of LCEL that don't need a network call to be interesting:
 * a `ChatPromptTemplate` (fills `{variables}` into a message list) and a
 * `StructuredOutputParser` built straight from a zod schema (it both
 * generates the "answer in this exact shape" instructions and later parses
 * the model's text back into a real object). Formatting a prompt is pure —
 * no API key needed — so this is the part of the pipeline you can see
 * working immediately, before you've entered a key at all.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { REVIEW_SCHEMA, type ReviewExtraction } from './schema';

export const outputParser = StructuredOutputParser.fromZodSchema(REVIEW_SCHEMA);

export const prompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    'You extract structured information from customer reviews. Always follow the formatting instructions exactly, and output nothing besides the requested format.\n\n{formatInstructions}',
  ],
  ['human', '{reviewText}'],
]);

export interface FormattedMessage {
  role: string;
  content: string;
}

/** Render the template against real inputs — pure, no network call. */
export async function formatPrompt(reviewText: string): Promise<FormattedMessage[]> {
  const formatInstructions = outputParser.getFormatInstructions();
  const value = await prompt.invoke({ reviewText, formatInstructions });
  return value.toChatMessages().map((m) => ({
    role: m.getType(),
    content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
  }));
}

export interface ParseOutcome {
  parsed: ReviewExtraction | null;
  parseError: string | null;
}

/** Try to parse the model's raw text into the schema — pure, no network call. */
export async function parseResponse(rawText: string): Promise<ParseOutcome> {
  try {
    return { parsed: await outputParser.parse(rawText), parseError: null };
  } catch (e) {
    return { parsed: null, parseError: e instanceof Error ? e.message : String(e) };
  }
}

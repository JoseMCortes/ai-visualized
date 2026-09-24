/**
 * The exact code this page is running, as text — so "watch it work" and
 * "here's what to paste into your own project" are the same artifact. Only
 * the model class + constructor options change between providers; the
 * template, schema, and chain shape stay identical, which is the point.
 */

import type { Provider } from './models';

const MODEL_IMPORT: Record<Provider, string> = {
  openai: `import { ChatOpenAI } from "@langchain/openai";`,
  anthropic: `import { ChatAnthropic } from "@langchain/anthropic";`,
};

const MODEL_CONSTRUCTOR: Record<Provider, (model: string) => string> = {
  openai: (model) => `const model = new ChatOpenAI({
  apiKey,
  model: "${model}",
  // only needed to call the API directly from a browser, like this demo does —
  // a real app should proxy this through a server instead
  configuration: { dangerouslyAllowBrowser: true },
});`,
  anthropic: (model) => `const model = new ChatAnthropic({
  apiKey,
  model: "${model}",
  // only needed to call the API directly from a browser, like this demo does —
  // a real app should proxy this through a server instead
  clientOptions: { dangerouslyAllowBrowser: true },
});`,
};

export function buildCodeSnippet(provider: Provider, model: string): string {
  return `import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
${MODEL_IMPORT[provider]}
import { z } from "zod";

// 1. the shape we want the answer in — also generates the
//    "reply with JSON like this" instructions below
const schema = z.object({
  sentiment: z.enum(["positive", "negative", "neutral"]),
  summary: z.string(),
  topics: z.array(z.string()),
});
const outputParser = StructuredOutputParser.fromZodSchema(schema);

// 2. the prompt template — {variables} get filled in at call time
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "Extract structured info from reviews.\\n\\n{formatInstructions}"],
  ["human", "{reviewText}"],
]);

// 3. the model
${MODEL_CONSTRUCTOR[provider](model)}

// 4. compose them with LCEL's pipe — this IS the chain
const chain = prompt.pipe(model).pipe(outputParser);

// 5. run it
const result = await chain.invoke({
  reviewText: "...",
  formatInstructions: outputParser.getFormatInstructions(),
});`;
}

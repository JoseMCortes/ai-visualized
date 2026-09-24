/**
 * What we're asking the model to extract from a short customer review, and a
 * few example reviews to try it on. The zod schema is the actual contract
 * handed to LangChain's structured output parser — the same object drives
 * both the "format your answer like this" instructions injected into the
 * prompt and the validation/parsing of whatever text comes back.
 */

import { z } from 'zod';

export const REVIEW_SCHEMA = z.object({
  sentiment: z
    .enum(['positive', 'negative', 'neutral'])
    .describe('the overall sentiment of the review'),
  summary: z.string().describe('one short sentence summarizing the review'),
  topics: z.array(z.string()).describe('2 to 4 short keywords for what the review talks about'),
});

export type ReviewExtraction = z.infer<typeof REVIEW_SCHEMA>;

export interface ExampleReview {
  id: string;
  label: string;
  text: string;
}

export const EXAMPLE_REVIEWS: ExampleReview[] = [
  {
    id: 'headphones',
    label: 'Headphones',
    text: "These headphones sounded amazing right out of the box — deep bass, crisp highs, genuinely impressive for the price. The battery life is solid too, I get almost two full days of casual listening. My only gripe is the ear cups get uncomfortably warm after an hour or so, and the carrying case feels a bit flimsy. Still, I'd recommend them.",
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    text: 'We waited 45 minutes past our reservation time with no explanation, and when the food finally came out the pasta was cold. The server was apologetic and comped a dessert, which was a nice gesture, but the whole evening felt disorganized. The dessert itself, for what it is worth, was excellent.',
  },
  {
    id: 'laptop',
    label: 'Laptop',
    text: 'Does exactly what I need for work — fast enough for a dozen browser tabs plus a video call, and the keyboard feels great to type on for long stretches. Fan noise is noticeable under load but not distracting. Fine machine, nothing exciting, no complaints.',
  },
];

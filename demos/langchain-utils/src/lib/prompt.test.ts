import { describe, expect, it } from 'vitest';
import { formatPrompt } from './prompt';
import { REVIEW_SCHEMA } from './schema';

describe('formatPrompt', () => {
  it('produces a system message and a human message', async () => {
    const messages = await formatPrompt('Great product, fast shipping.');
    expect(messages).toHaveLength(2);
    expect(messages[0]!.role).toBe('system');
    expect(messages[1]!.role).toBe('human');
  });

  it('fills the review text into the human message verbatim', async () => {
    const messages = await formatPrompt('Broke after two days, would not buy again.');
    expect(messages[1]!.content).toBe('Broke after two days, would not buy again.');
  });

  it('injects the schema-derived format instructions into the system message', async () => {
    const messages = await formatPrompt('It was fine.');
    // StructuredOutputParser's instructions always mention the JSON shape it wants back
    expect(messages[0]!.content).toMatch(/JSON/i);
    expect(messages[0]!.content).toMatch(/sentiment/);
    expect(messages[0]!.content).toMatch(/summary/);
    expect(messages[0]!.content).toMatch(/topics/);
  });

  it('needs no API key or network access — it is pure template filling', async () => {
    // if this resolves at all without a key configured anywhere, the point is made
    await expect(formatPrompt('anything')).resolves.toBeDefined();
  });
});

describe('REVIEW_SCHEMA', () => {
  it('accepts a well-formed extraction', () => {
    const result = REVIEW_SCHEMA.safeParse({
      sentiment: 'positive',
      summary: 'Customer liked it.',
      topics: ['quality', 'shipping'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a sentiment outside the enum', () => {
    const result = REVIEW_SCHEMA.safeParse({
      sentiment: 'mixed',
      summary: 'Customer liked it.',
      topics: ['quality'],
    });
    expect(result.success).toBe(false);
  });
});

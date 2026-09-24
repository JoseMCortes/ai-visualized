import { describe, expect, it } from 'vitest';
import { buildCodeSnippet } from './codeSnippet';

describe('buildCodeSnippet', () => {
  it('imports and constructs ChatOpenAI for the openai provider', () => {
    const code = buildCodeSnippet('openai', 'gpt-4o-mini');
    expect(code).toContain('import { ChatOpenAI } from "@langchain/openai"');
    expect(code).toContain('new ChatOpenAI({');
    expect(code).toContain('model: "gpt-4o-mini"');
    expect(code).toContain('configuration: { dangerouslyAllowBrowser: true }');
    expect(code).not.toContain('ChatAnthropic');
  });

  it('imports and constructs ChatAnthropic for the anthropic provider', () => {
    const code = buildCodeSnippet('anthropic', 'claude-haiku-4-5-20251001');
    expect(code).toContain('import { ChatAnthropic } from "@langchain/anthropic"');
    expect(code).toContain('new ChatAnthropic({');
    expect(code).toContain('model: "claude-haiku-4-5-20251001"');
    expect(code).toContain('clientOptions: { dangerouslyAllowBrowser: true }');
    expect(code).not.toContain('ChatOpenAI');
  });

  it('always shows the LCEL pipe composition, regardless of provider', () => {
    for (const [provider, model] of [
      ['openai', 'gpt-4o-mini'],
      ['anthropic', 'claude-haiku-4-5-20251001'],
    ] as const) {
      const code = buildCodeSnippet(provider, model);
      expect(code).toContain('prompt.pipe(model).pipe(outputParser)');
    }
  });
});

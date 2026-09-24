/**
 * The one line that changes when you swap providers — everything else in
 * the chain (the prompt, the parser, the input) stays identical. Both SDKs
 * refuse to run in a browser unless you explicitly opt in, since shipping a
 * secret key to client-side code is normally a bad idea; `dangerouslyAllowBrowser`
 * is that opt-in. Here it's the whole point: the key is the *visitor's own*,
 * typed into their own browser, sent straight to the provider — never to us.
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { outputParser, prompt } from './prompt';

export type Provider = 'openai' | 'anthropic';

export interface ProviderInfo {
  id: Provider;
  label: string;
  defaultModel: string;
  keyHint: string;
  keyPlaceholder: string;
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    keyHint: 'platform.openai.com/api-keys',
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    defaultModel: 'claude-haiku-4-5-20251001',
    keyHint: 'console.anthropic.com/settings/keys',
    keyPlaceholder: 'sk-ant-...',
  },
];

export interface ModelConfig {
  provider: Provider;
  apiKey: string;
  model: string;
}

export function buildModel(cfg: ModelConfig): BaseChatModel {
  if (cfg.provider === 'openai') {
    return new ChatOpenAI({
      apiKey: cfg.apiKey,
      model: cfg.model,
      temperature: 0,
      configuration: { dangerouslyAllowBrowser: true },
    });
  }
  return new ChatAnthropic({
    apiKey: cfg.apiKey,
    model: cfg.model,
    temperature: 0,
    clientOptions: { dangerouslyAllowBrowser: true },
  });
}

/**
 * Stage 2 of the pipeline: the actual network call. Re-renders the prompt
 * (cheap and pure) rather than accepting already-formatted messages, so
 * this function is a self-contained "send this review, get raw text back"
 * — the only piece of the whole demo that talks to the outside world.
 */
export async function callModel(reviewText: string, cfg: ModelConfig): Promise<string> {
  const formatInstructions = outputParser.getFormatInstructions();
  const promptValue = await prompt.invoke({ reviewText, formatInstructions });
  const model = buildModel(cfg);
  const aiMessage = await model.invoke(promptValue.toChatMessages());
  return typeof aiMessage.content === 'string'
    ? aiMessage.content
    : JSON.stringify(aiMessage.content);
}

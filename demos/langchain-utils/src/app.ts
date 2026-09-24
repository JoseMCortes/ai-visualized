/**
 * Wires state (provider, key, model, review text) to every view. The
 * template stage runs immediately and needs no key — everything after it
 * (the real model call, and the parse that follows) only runs when you
 * press "Run chain" with a key entered.
 */

import { buildCodeSnippet } from './lib/codeSnippet';
import { clearStoredKey, getStoredKey, setStoredKey } from './lib/keys';
import { PROVIDERS, callModel, type ModelConfig, type Provider } from './lib/models';
import { formatPrompt, parseResponse } from './lib/prompt';
import { EXAMPLE_REVIEWS } from './lib/schema';
import { createCodePanel } from './views/codePanel';
import { createKeyPanel } from './views/keyPanel';
import { createPipeline, type PipelineStages, type StageStatus } from './views/pipeline';
import { createResultPanel } from './views/resultPanel';
import { createReviewPicker } from './views/reviewPicker';

export function mountApp(root: HTMLElement): void {
  const keyHost = document.createElement('div');
  const reviewHost = document.createElement('div');
  const codeHost = document.createElement('div');
  const pipelineHost = document.createElement('div');
  const runBar = document.createElement('div');
  runBar.className = 'run-bar';
  const resultHost = document.createElement('div');

  root.replaceChildren(reviewHost, keyHost, codeHost, pipelineHost, runBar, resultHost);

  const keyPanel = createKeyPanel({
    onProvider: (p) => {
      provider = p;
      renderKeyPanel();
      renderCode();
      resetDownstream();
    },
    onKeyChange: (key) => {
      apiKeys[provider] = key;
      setStoredKey(provider, key);
    },
    onModelChange: (model) => {
      models[provider] = model;
      renderCode();
      resetDownstream();
    },
    onClearKey: () => {
      apiKeys[provider] = '';
      clearStoredKey(provider);
      renderKeyPanel();
    },
  });
  keyHost.appendChild(keyPanel.el);

  const reviewPicker = createReviewPicker(EXAMPLE_REVIEWS, {
    onPreset: (r) => {
      activePresetId = r.id;
      reviewText = r.text;
      renderReviewPicker();
      renderTemplateStage();
      resetDownstream();
    },
    onTextChange: (text) => {
      activePresetId = null;
      reviewText = text;
      renderTemplateStage();
      resetDownstream();
    },
  });
  reviewHost.appendChild(reviewPicker.el);

  const codePanel = createCodePanel();
  codeHost.appendChild(codePanel.el);

  const pipeline = createPipeline();
  pipelineHost.appendChild(pipeline.el);

  const runBtn = document.createElement('button');
  runBtn.type = 'button';
  runBtn.className = 'btn btn-primary run-btn';
  runBtn.textContent = 'Run chain ▶';
  runBtn.addEventListener('click', () => void runChain());
  const runMsg = document.createElement('span');
  runMsg.className = 'run-msg';
  runBar.append(runBtn, runMsg);

  const resultPanel = createResultPanel();
  resultHost.appendChild(resultPanel.el);

  let provider: Provider = 'openai';
  const apiKeys: Record<Provider, string> = {
    openai: getStoredKey('openai'),
    anthropic: getStoredKey('anthropic'),
  };
  const models: Record<Provider, string> = Object.fromEntries(
    PROVIDERS.map((p) => [p.id, p.defaultModel]),
  ) as Record<Provider, string>;
  let activePresetId: string | null = EXAMPLE_REVIEWS[0]!.id;
  let reviewText = EXAMPLE_REVIEWS[0]!.text;
  let running = false;
  let stages: PipelineStages = { template: 'idle', model: 'idle', parser: 'idle', result: 'idle' };
  let templateGeneration = 0;

  function setStages(patch: Partial<PipelineStages>): void {
    stages = { ...stages, ...patch };
    pipeline.render(stages);
  }

  function renderKeyPanel(): void {
    keyPanel.render({ provider, apiKey: apiKeys[provider], model: models[provider] });
  }

  function renderReviewPicker(): void {
    reviewPicker.render(activePresetId, reviewText);
  }

  function renderCode(): void {
    codePanel.render(buildCodeSnippet(provider, models[provider]));
  }

  function resetDownstream(): void {
    setStages({ model: 'idle', parser: 'idle', result: 'idle' });
    resultPanel.renderResult({ kind: 'idle' });
  }

  function renderTemplateStage(): void {
    const gen = ++templateGeneration;
    setStages({ template: 'active' as StageStatus });
    formatPrompt(reviewText).then((messages) => {
      if (gen !== templateGeneration) return; // a newer edit has since superseded this one
      resultPanel.renderPrompt(messages);
      setStages({ template: 'done' });
    });
  }

  async function runChain(): Promise<void> {
    if (running) return;
    const key = apiKeys[provider].trim();
    if (!key) {
      runMsg.textContent = `Enter your ${PROVIDERS.find((p) => p.id === provider)!.label} API key above first.`;
      return;
    }
    runMsg.textContent = '';
    running = true;
    runBtn.disabled = true;
    setStages({ model: 'active', parser: 'idle', result: 'idle' });
    resultPanel.renderResult({ kind: 'running' });

    const cfg: ModelConfig = { provider, apiKey: key, model: models[provider] };

    try {
      const rawResponse = await callModel(reviewText, cfg);
      setStages({ model: 'done', parser: 'active' });
      const { parsed, parseError } = await parseResponse(rawResponse);
      setStages({ parser: parseError ? 'error' : 'done', result: parseError ? 'error' : 'done' });
      resultPanel.renderResult({ kind: 'done', rawResponse, parsed, parseError });
    } catch (e) {
      setStages({ model: 'error' });
      const message = e instanceof Error ? e.message : String(e);
      resultPanel.renderResult({ kind: 'error', message });
    } finally {
      running = false;
      runBtn.disabled = false;
    }
  }

  renderKeyPanel();
  renderReviewPicker();
  renderCode();
  renderTemplateStage();
}

export type MitigationId =
  'delimiters' | 'hierarchy' | 'input_filter' | 'output_filter' | 'no_secret_in_prompt';

export interface MitigationDef {
  id: MitigationId;
  label: string;
  /** One plain sentence — shown right next to the toggle. */
  description: string;
}

export const MITIGATIONS: MitigationDef[] = [
  {
    id: 'delimiters',
    label: 'Mark untrusted content',
    description:
      'Wrap anything that came from outside (documents, web pages) in a tagged block, and tell the model that block is information to read, never an instruction to follow.',
  },
  {
    id: 'hierarchy',
    label: 'Instruction hierarchy',
    description:
      "Rank the sources: the developer's system prompt always outranks the user, and the user always outranks any document. A lower-ranked source can't override a higher one.",
  },
  {
    id: 'input_filter',
    label: 'Input keyword filter',
    description:
      'Scan incoming text for known manipulation phrases ("ignore your instructions", "you are DAN"...) and refuse before the model even runs.',
  },
  {
    id: 'output_filter',
    label: 'Output filter',
    description:
      "Scan the model's draft reply for the secret before sending it, and redact it if found — a last line of defense even if everything else missed the attempt.",
  },
  {
    id: 'no_secret_in_prompt',
    label: "Don't give the model the secret",
    description:
      "Keep the secret out of the model's context entirely; check it in ordinary code instead. If the model never sees it, it can't leak it.",
  },
];

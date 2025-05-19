export type Archetype = {
  id: string;
  name: string;
  colors: string[];
  description: string;
  keyCards?: string[];
};

export type Card = {
  id: string;
  name: string;
  manaCost: string;
  type: string;
  rarity: string;
  text: string;
  flavorText?: string;
  artist?: string;
  power?: string;
  toughness?: string;
  loyalty?: number;
  imageUrl?: string;
  colors: string[];
  custom: boolean;
  archetypes: string[];
  set?: string;
  notes?: string;
  relatedTokens?: string[];
  relatedFace?: string;
  facedown?: boolean;
};

export type Token = {
  id: string;
  name: string;
  type: string;
  colors: string[];
  power?: string;
  toughness?: string;
  abilities?: string[];
  imageUrl?: string;
};

export type Tool = {
  id: string;
  name: string;
  description: string;
  path: string;
};

export type Suggestion = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  createdBy?: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
};

export type DistilledModel = {
  name: string;
  base_model: string;
  download_link: string;
};

export type BenchmarkResult = {
  benchmark: string;
  claude_3_5: string;
  gpt_4o: string;
  openai_o1_mini: string;
  openai_o1: string;
};

export type DistilledEvaluation = {
  model: string;
  aime_2024: string;
  aime_2024_cons: string;
  math_500: string;
  gpqa_diamond: string;
  livecodebench: string;
  codeforces_rating: string;
};

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
  power?: string;
  toughness?: string;
  loyalty?: number;
  imageUrl?: string;
  colors: string[];
  custom: boolean;
  archetypes: string[];
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

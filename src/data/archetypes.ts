import { Archetype } from '@/types/types';

export const archetypes: Archetype[] = [
  {
    id: 'wu-storm',
    name: 'Storm',
    colors: ['W', 'U'],
    description: 'Cast multiple spells in a turn to trigger powerful effects.',
  },
  {
    id: 'ub-broken-cipher',
    name: 'Broken Cipher',
    colors: ['U', 'B'],
    description: 'Encode secrets onto creatures and gain value when they deal combat damage.',
  },
  {
    id: 'br-token-collection',
    name: 'Token Collection',
    colors: ['B', 'R'],
    description: 'Create and collect various token types for different synergies.',
  },
  {
    id: 'rg-control',
    name: 'Control',
    colors: ['R', 'G'],
    description: 'An unusual take on control using red and green to dominate the board.',
  },
  {
    id: 'gw-vehicles',
    name: 'Vehicles',
    colors: ['G', 'W'],
    description: 'Crew powerful artifact vehicles with your creatures for strong attacks.',
  },
  {
    id: 'wb-blink',
    name: 'Blink/ETB/Value',
    colors: ['W', 'B'],
    description: 'Flicker creatures in and out of the battlefield to accumulate triggers.',
  },
  {
    id: 'bg-artifacts',
    name: 'Artifacts',
    colors: ['B', 'G'],
    description: 'Leverage artifacts for value and synergy in an unusual color combination.',
  },
  {
    id: 'ur-enchantments',
    name: 'Enchantments',
    colors: ['U', 'R'],
    description: 'Use enchantments to control the game and generate value over time.',
  },
  {
    id: 'rw-self-mill',
    name: 'Self-mill',
    colors: ['R', 'W'],
    description: 'Put cards from your library into your graveyard for value and synergy.',
  },
  {
    id: 'gu-prowess',
    name: 'Prowess',
    colors: ['G', 'U'],
    description: 'Cast non-creature spells to trigger bonuses on your creatures.',
  },
];

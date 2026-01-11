
import type { Color } from './types';

export const seedCouleurs: Omit<Color, 'id'>[] = [
  { name: 'Argent', hexCode: '#C0C0C0' },
  { name: 'Beige', hexCode: '#F5F5DC' },
  { name: 'Blanc', hexCode: '#FFFFFF' },
  { name: 'Bleu', hexCode: '#0000FF' },
  { name: 'Bleu Azur', hexCode: '#007FFF' },
  { name: 'Bleu Horn', hexCode: '#A1B3D0' },
  { name: 'Bleu Mat', hexCode: '#3F5A7F' },
  { name: 'Dark Havana', hexCode: '#5D3A1A' },
  { name: 'Gris', hexCode: '#808080' },
  { name: 'Jaune', hexCode: '#FFFF00' },
  { name: 'Marron', hexCode: '#964B00' },
  { name: 'Noir', hexCode: '#000000' },
  { name: 'Or', hexCode: '#FFD700' },
  { name: 'Orange', hexCode: '#FFA500' },
  { name: 'Rose', hexCode: '#FFC0CB' },
  { name: 'Rouge', hexCode: '#FF0000' },
  { name: 'Transparent', hexCode: 'rgba(255, 255, 255, 0.5)' },
  { name: 'Vert', hexCode: '#008000' },
  { name: 'Violet', hexCode: '#800080' },
  { name: 'Multi-couleur', hexCode: 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)' },
];

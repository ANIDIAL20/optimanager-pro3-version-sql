
import type { Material } from './types';

export const seedMaterials: Omit<Material, 'id'>[] = [
  { name: 'Acétate', type: 'Monture' },
  { name: 'Acier Inoxydable', type: 'Monture' },
  { name: 'Aluminium', type: 'Monture' },
  { name: 'Fibre de Carbone', type: 'Monture' },
  { name: 'Métal', type: 'Monture' },
  { name: 'Minérale', type: 'Verre' },
  { name: 'Optyl', type: 'Monture' },
  { name: 'Organique', type: 'Verre' },
  { name: 'PC Hydrogel', type: 'Lentille' },
  { name: 'Plastique', type: 'Monture' },
  { name: 'Polycarbonate', type: 'Verre' },
  { name: 'Propionate', type: 'Monture' },
  { name: 'Silicone', type: 'Monture' },
  { name: 'Silicone Hydrogel', type: 'Lentille' },
  { name: 'Titane', type: 'Monture' },
];

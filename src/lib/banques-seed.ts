import type { Banque } from './types';

export const seedBanques: Omit<Banque, 'id'>[] = [
  { name: 'Al Barid Bank', code: 'BDBK' },
  { name: 'Arab Bank', code: 'AB' },
  { name: 'Attijariwafa Bank', code: 'ATW' },
  { name: 'Bank Al Maghrib', code: 'BAM' },
  { name: 'BMCI', code: 'BMCI' },
  { name: 'BMCE Bank', code: 'BMCE' },
  { name: 'Banque Populaire', code: 'BP' },
  { name: 'Citibank', code: 'CB' },
  { name: 'Crédit Agricole', code: 'CA' },
  { name: 'Crédit du Maroc', code: 'CM' },
  { name: 'CIH Bank', code: 'CIH' },
  { name: 'Société Générale', code: 'SG' },
  { name: 'Trésorerie Générale du Royaume', code: 'TGR' },
];

// @ts-nocheck
/**
 * Seed Settings Data
 * 
 * Populate settings tables with common default values
 */

'use server';

import { db } from '@/db';
import { categories, brands, colors, materials, treatments, insurances, mountingTypes, banks } from '@/db/schema';
import { auth } from '@/auth';
import { eq } from 'drizzle-orm';

// ========================================
// SEED DATA
// ========================================

const defaultCategories = [
  'Accessoires',
  'Cordons',
  'Etuis',
  'Lentilles de Contact',
  'Montures',
  'Produits d\'entretien',
  'Verres',
];

const defaultBrands = [
  // Premium (51)
  { name: 'AUGUSTO VALENTINI', category: 'Premium' },
  { name: 'Alexander McQueen', category: 'Premium' },
  { name: 'BLUMARINE', category: 'Premium' },
  { name: 'BOSS', category: 'Premium' },
  { name: 'BOUCHERON', category: 'Premium' },
  { name: 'Balenciaga', category: 'Premium' },
  { name: 'Bvlgari', category: 'Premium' },
  { name: 'COACH', category: 'Premium' },
  { name: 'Cartier', category: 'Premium' },
  { name: 'Celine', category: 'Premium' },
  { name: 'Chanel', category: 'Premium' },
  { name: 'Chloé', category: 'Premium' },
  { name: 'DSQUARED', category: 'Premium' },
  { name: 'Dior', category: 'Premium' },
  { name: 'Dolce & Gabbana', category: 'Premium' },
  { name: 'EMILIO PUCCI', category: 'Premium' },
  { name: 'ESCADA', category: 'Premium' },
  { name: 'FERRAGAMO', category: 'Premium' },
  { name: 'FERRARI', category: 'Premium' },
  { name: 'FERRE', category: 'Premium' },
  { name: 'FURLA', category: 'Premium' },
  { name: 'Fendi', category: 'Premium' },
  { name: 'GF FERRE', category: 'Premium' },
  { name: 'Giorgio Armani', category: 'Premium' },
  { name: 'Givenchy', category: 'Premium' },
  { name: 'Gucci', category: 'Premium' },
  { name: 'JIMMY CHOO', category: 'Premium' },
  { name: 'JUST CAVALLI', category: 'Premium' },
  { name: 'Loewe', category: 'Premium' },
  { name: 'MARC JACOBS', category: 'Premium' },
  { name: 'MAX MARA', category: 'Premium' },
  { name: 'MICHAEL KORS', category: 'Premium' },
  { name: 'MONT BLANC', category: 'Premium' },
  { name: 'Miu Miu', category: 'Premium' },
  { name: 'Moncler', category: 'Premium' },
  { name: 'PUCCI', category: 'Premium' },
  { name: 'Prada', category: 'Premium' },
  { name: 'RENATO BALESTRA', category: 'Premium' },
  { name: 'ROBERTO CAVALLI', category: 'Premium' },
  { name: 'Ralph Lauren', category: 'Premium' },
  { name: 'S.T. Dupont', category: 'Premium' },
  { name: 'STELLA McCARTNEY', category: 'Premium' },
  { name: 'SWAROVSKI', category: 'Premium' },
  { name: 'Saint Laurent', category: 'Premium' },
  { name: 'TAG', category: 'Premium' },
  { name: 'TIFFANY', category: 'Premium' },
  { name: 'TIFFANY & CO', category: 'Premium' },
  { name: 'Tom Ford', category: 'Premium' },
  { name: 'Valentino', category: 'Premium' },
  { name: 'Versace', category: 'Premium' },
  { name: 'YVES SAINT LAURENT', category: 'Premium' },

  // Populaire (28)
  { name: 'ARMANI EXCHANGE', category: 'Populaire' },
  { name: 'Calvin Klein', category: 'Populaire' },
  { name: 'Carolina Herrera', category: 'Populaire' },
  { name: 'Carrera', category: 'Populaire' },
  { name: 'Converse', category: 'Populaire' },
  { name: 'David Beckham', category: 'Populaire' },
  { name: 'Diesel', category: 'Populaire' },
  { name: 'EASY EYEWEAR', category: 'Populaire' },
  { name: 'Emporio Armani', category: 'Populaire' },
  { name: 'GANT', category: 'Populaire' },
  { name: 'Guess', category: 'Populaire' },
  { name: 'Hugo Boss', category: 'Populaire' },
  { name: 'LACOSTE', category: 'Populaire' },
  { name: 'LEVIS', category: 'Populaire' },
  { name: 'MISS SIXTY', category: 'Populaire' },
  { name: 'OXYDO', category: 'Populaire' },
  { name: 'Oakley', category: 'Populaire' },
  { name: 'PIERRE CARDIN', category: 'Populaire' },
  { name: 'POLAR', category: 'Populaire' },
  { name: 'POLAROID', category: 'Populaire' },
  { name: 'POLICE', category: 'Populaire' },
  { name: 'Persol', category: 'Populaire' },
  { name: 'Polarised', category: 'Populaire' },
  { name: 'REPLAY', category: 'Populaire' },
  { name: 'Ray-Ban', category: 'Populaire' },
  { name: 'TIMBERLAND', category: 'Populaire' },
  { name: 'TOMMY HILFIGER', category: 'Populaire' },
  { name: 'Vogue', category: 'Populaire' },

  // Française (14)
  { name: 'Alain Mikli', category: 'Française' },
  { name: 'Anne & Valentin', category: 'Française' },
  { name: 'Atelier Particulier', category: 'Française' },
  { name: 'Caroline Abram', category: 'Française' },
  { name: 'HENRY JULIEN', category: 'Française' },
  { name: 'JF Rey', category: 'Française' },
  { name: 'Jimmy Fairly', category: 'Française' },
  { name: 'Lesca', category: 'Française' },
  { name: 'MINIMA', category: 'Française' },
  { name: 'Morel', category: 'Française' },
  { name: 'OXIBIS', category: 'Française' },
  { name: 'PIERRE LOTI', category: 'Française' },
  { name: 'SAINT MICHEL', category: 'Française' },
  { name: 'Vuarnet', category: 'Française' },

  // Autre (81)
  { name: '2-LIGHT', category: 'Autre' },
  { name: 'AB LENS', category: 'Autre' },
  { name: 'ADELMI', category: 'Autre' },
  { name: 'ADORE', category: 'Autre' },
  { name: 'ALCON', category: 'Autre' },
  { name: 'AVEO', category: 'Autre' },
  { name: 'AVIZOR', category: 'Autre' },
  { name: 'BBGR', category: 'Autre' },
  { name: 'BELLA', category: 'Autre' },
  { name: 'BIRKA', category: 'Autre' },
  { name: 'BUNOVIATA', category: 'Autre' },
  { name: 'Bausch & Lomb', category: 'Autre' },
  { name: 'Bollé', category: 'Autre' },
  { name: 'CARLO ROSSI', category: 'Autre' },
  { name: 'CECI', category: 'Autre' },
  { name: 'COLLECTION CREATIVE', category: 'Autre' },
  { name: 'COOPER VISION', category: 'Autre' },
  { name: 'COTTET', category: 'Autre' },
  { name: 'Ciba Vision', category: 'Autre' },
  { name: 'Cutler and Gross', category: 'Autre' },
  { name: 'D&T', category: 'Autre' },
  { name: 'ELCE', category: 'Autre' },
  { name: 'EXALTO', category: 'Autre' },
  { name: 'EXTE', category: 'Autre' },
  { name: 'Essilor', category: 'Autre' },
  { name: 'Etnia Barcelona', category: 'Autre' },
  { name: 'FACELOOX', category: 'Autre' },
  { name: 'FASHION TV', category: 'Autre' },
  { name: 'FINEWEAR', category: 'Autre' },
  { name: 'FP', category: 'Autre' },
  { name: 'FYSH', category: 'Autre' },
  { name: 'GUEST', category: 'Autre' },
  { name: 'Garrett Leight', category: 'Autre' },
  { name: 'INDO', category: 'Autre' },
  { name: 'INTEROJO', category: 'Autre' },
  { name: 'INVU', category: 'Autre' },
  { name: 'ITALIA INDEPENDENT', category: 'Autre' },
  { name: 'JOE KENT', category: 'Autre' },
  { name: 'Johnson & Johnson', category: 'Autre' },
  { name: 'Kirk Original', category: 'Autre' },
  { name: 'LEOPARD', category: 'Autre' },
  { name: 'LIAISON', category: 'Autre' },
  { name: 'LIGHTEC', category: 'Autre' },
  { name: 'LIGIERS', category: 'Autre' },
  { name: 'LN OPTIC', category: 'Autre' },
  { name: 'LOZZA', category: 'Autre' },
  { name: 'LUXOTTICA', category: 'Autre' },
  { name: 'MEGALENS', category: 'Autre' },
  { name: 'MEGALENS-FREQUENCY', category: 'Autre' },
  { name: 'MENICON', category: 'Autre' },
  { name: 'Masunaga', category: 'Autre' },
  { name: 'Matsuda', category: 'Autre' },
  { name: 'Mega Optic', category: 'Autre' },
  { name: 'Moscot', category: 'Autre' },
  { name: 'Mottler', category: 'Autre' },
  { name: 'NATURE COLOR', category: 'Autre' },
  { name: 'NUOVO EMPORIO', category: 'Autre' },
  { name: 'OEO', category: 'Autre' },
  { name: 'Oliver Peoples', category: 'Autre' },
  { name: 'PLUS', category: 'Autre' },
  { name: 'ROBERT CASTEL', category: 'Autre' },
  { name: 'ROBERTO CARRAS', category: 'Autre' },
  { name: 'ROSALBA', category: 'Autre' },
  { name: 'Rodenstock', category: 'Autre' },
  { name: 'SHOAL', category: 'Autre' },
  { name: 'SIMPLE', category: 'Autre' },
  { name: 'SOLEKO', category: 'Autre' },
  { name: 'SOLOTICA', category: 'Autre' },
  { name: 'STEPPER TITANIUM', category: 'Autre' },
  { name: 'Sillouette', category: 'Autre' },
  { name: 'THE LINE', category: 'Autre' },
  { name: 'TITTO BLUNI', category: 'Autre' },
  { name: 'TREE', category: 'Autre' },
  { name: 'VANNI', category: 'Autre' },
  { name: 'VASCO DE GAMA', category: 'Autre' },
  { name: 'VISION OPTIQUE', category: 'Autre' },
  { name: 'VISTALIA FASHION', category: 'Autre' },
  { name: 'WEB', category: 'Autre' },
  { name: 'WEST', category: 'Autre' },
  { name: 'Xelis', category: 'Autre' },
  { name: 'ZEISS', category: 'Autre' },
];

const defaultColors = [
  'Argent',
  'Blanc',
  'Bleu',
  'Bleu Azur',
  'Bleu Horn',
  'Bleu Mat',
  'Dark Havana',
  'Gris',
  'Jaune',
  'Marron',
  'Multi-couleur',
  'Noir',
  'Or',
  'Orange',
  'Rose',
  'Rouge',
  'Transparent',
  'Vert',
  'Violet',
];

const defaultMaterials = [
  // Monture (9)
  { name: 'Acier Inoxydable', category: 'Monture' },
  { name: 'Aluminium', category: 'Monture' },
  { name: 'Fibre de Carbone', category: 'Monture' },
  { name: 'Métal', category: 'Monture' },
  { name: 'Optyl', category: 'Monture' },
  { name: 'Plastique', category: 'Monture' },
  { name: 'Propionate', category: 'Monture' },
  { name: 'Silicone', category: 'Monture' },
  { name: 'Titane', category: 'Monture' },

  // Verre (3)
  { name: 'Minérale', category: 'Verre' },
  { name: 'Organique', category: 'Verre' },
  { name: 'Polycarbonate', category: 'Verre' },

  // Lentille (2)
  { name: 'PC Hydrogel', category: 'Lentille' },
  { name: 'Silicone Hydrogel', category: 'Lentille' },
];

const defaultTreatments = [
  'Anti-lumière bleue',
  'Anti-rayures',
  'Anti-reflet',
  'Durci',
  'Hydrophobe',
  'Oléophobe',
  'Photochromique',
  'Polarisant',
  'Polarisé',
  'UV protection',
];

const defaultInsurances = [
  'AMO',
  'AXA Assurance Maroc',
  'Assurance Allianz',
  'Atlanta',
  'CNIA',
  'CNOPS',
  'CNSS',
  'FAR',
  'MAMDA',
  'MCMA',
  'MGEN',
  'MGPAP',
  'MGPTT',
  'Mutuelle de la Police',
  'Mutuelle des Banques Populaires',
  'Mutuelle des Douanes',
  'OMFAM',
  'RMA Watanya',
  'SAHAM',
  'Sanad',
  'Wafa Assurance',
];

const defaultMountingTypes = [
  'Cerclée',
  'Chauffage monture',
  'Nylor',
  'Percée',
  'Sans monture',
  'Semi-cerclée',
  'Verre à froid',
  'Vissage',
];

const defaultBanks = [
  'Al Barid Bank',
  'Arab Bank',
  'Attijariwafa Bank',
  'BMCE Bank',
  'BMCI',
  'Bank Al Maghrib',
  'Banque Populaire',
  'CIH Bank',
  'Citibank',
  'Crédit Agricole',
  'Crédit du Maroc',
  'Société Générale',
  'Trésorerie Générale du Royaume',
];

// ========================================
// SEED ACTIONS
// ========================================

/**
 * Seed categories
 */
export async function seedCategories() {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  // Get existing items to avoid duplicates
  const existingItems = await db
    .select({ name: categories.name })
    .from(categories)
    .where(eq(categories.userId, session.user.id));

  const existingNames = new Set(existingItems.map(i => i.name.toLowerCase()));

  // Filter only new items
  const toInsert = defaultCategories.filter(name => !existingNames.has(name.toLowerCase()));

  if (toInsert.length === 0) {
    return { message: 'Catégories déjà à jour', count: 0 };
  }

  // Insert missing items
  const inserted = await db
    .insert(categories)
    .values(
      toInsert.map(name => ({
        userId: session.user.id,
        name,
      }))
    )
    .returning();

  console.log('[seedCategories] Inserted:', inserted.length);
  return { message: `Importation réussie (${inserted.length} ajoutés)`, count: inserted.length };
}

/**
 * Seed brands
 */
export async function seedBrands() {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  const existingItems = await db
    .select({ name: brands.name })
    .from(brands)
    .where(eq(brands.userId, session.user.id));

  const existingNames = new Set(existingItems.map(i => i.name.toLowerCase()));

  const toInsert = defaultBrands.filter(b => !existingNames.has(b.name.toLowerCase()));

  if (toInsert.length === 0) {
    return { message: 'Marques déjà à jour', count: 0 };
  }

  // Chunk inserts if too many (Postgres limit)
  // For < 1000 it's fine, but good practice. safe limit ~1000 parameters.
  // defaultBrands is ~200 items * 3 columns = 600 params. Safe.
  
  const inserted = await db
    .insert(brands)
    .values(
      toInsert.map(brand => ({
        userId: session.user.id,
        ...brand,
      }))
    )
    .returning();

  console.log('[seedBrands] Inserted:', inserted.length);
  return { message: `Importation réussie (${inserted.length} ajoutés)`, count: inserted.length };
}

/**
 * Seed colors
 */
export async function seedColors() {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  const existingItems = await db
    .select({ name: colors.name })
    .from(colors)
    .where(eq(colors.userId, session.user.id));

  const existingNames = new Set(existingItems.map(i => i.name.toLowerCase()));

  const toInsert = defaultColors.filter(name => !existingNames.has(name.toLowerCase()));

  if (toInsert.length === 0) {
    return { message: 'Couleurs déjà à jour', count: 0 };
  }

  const inserted = await db
    .insert(colors)
    .values(
      toInsert.map(name => ({
        userId: session.user.id,
        name,
      }))
    )
    .returning();

  console.log('[seedColors] Inserted:', inserted.length);
  return { message: `Importation réussie (${inserted.length} ajoutés)`, count: inserted.length };
}

/**
 * Seed materials
 */
export async function seedMaterials() {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  const existingItems = await db
    .select({ name: materials.name })
    .from(materials)
    .where(eq(materials.userId, session.user.id));

  const existingNames = new Set(existingItems.map(i => i.name.toLowerCase()));

  const toInsert = defaultMaterials.filter(m => !existingNames.has(m.name.toLowerCase()));

  if (toInsert.length === 0) {
    return { message: 'Matières déjà à jour', count: 0 };
  }

  const inserted = await db
    .insert(materials)
    .values(
      toInsert.map(m => ({
        userId: session.user.id,
        ...m,
      }))
    )
    .returning();

  console.log('[seedMaterials] Inserted:', inserted.length);
  return { message: `Importation réussie (${inserted.length} ajoutés)`, count: inserted.length };
}

/**
 * Seed treatments
 */
export async function seedTreatments() {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  const existingItems = await db
    .select({ name: treatments.name })
    .from(treatments)
    .where(eq(treatments.userId, session.user.id));

  const existingNames = new Set(existingItems.map(i => i.name.toLowerCase()));

  const toInsert = defaultTreatments.filter(name => !existingNames.has(name.toLowerCase()));

  if (toInsert.length === 0) {
    return { message: 'Traitements déjà à jour', count: 0 };
  }

  const inserted = await db
    .insert(treatments)
    .values(
      toInsert.map(name => ({
        userId: session.user.id,
        name,
      }))
    )
    .returning();

  console.log('[seedTreatments] Inserted:', inserted.length);
  return { message: `Importation réussie (${inserted.length} ajoutés)`, count: inserted.length };
}

/**
 * Seed insurances
 */
export async function seedInsurances() {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  const existingItems = await db
    .select({ name: insurances.name })
    .from(insurances)
    .where(eq(insurances.userId, session.user.id));

  const existingNames = new Set(existingItems.map(i => i.name.toLowerCase()));

  const toInsert = defaultInsurances.filter(name => !existingNames.has(name.toLowerCase()));

  if (toInsert.length === 0) {
    return { message: 'Mutuelles déjà à jour', count: 0 };
  }

  const inserted = await db
    .insert(insurances)
    .values(
      toInsert.map(name => ({
        userId: session.user.id,
        name,
      }))
    )
    .returning();

  console.log('[seedInsurances] Inserted:', inserted.length);
  return { message: `Importation réussie (${inserted.length} ajoutés)`, count: inserted.length };
}

/**
 * Seed mounting types
 */
export async function seedMountingTypes() {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  const existingItems = await db
    .select({ name: mountingTypes.name })
    .from(mountingTypes)
    .where(eq(mountingTypes.userId, session.user.id));

  const existingNames = new Set(existingItems.map(i => i.name.toLowerCase()));

  const toInsert = defaultMountingTypes.filter(name => !existingNames.has(name.toLowerCase()));

  if (toInsert.length === 0) {
    return { message: 'Types de montage déjà à jour', count: 0 };
  }

  const inserted = await db
    .insert(mountingTypes)
    .values(
      toInsert.map(name => ({
        userId: session.user.id,
        name,
      }))
    )
    .returning();

  console.log('[seedMountingTypes] Inserted:', inserted.length);
  return { message: `Importation réussie (${inserted.length} ajoutés)`, count: inserted.length };
}

/**
 * Seed banks
 */
export async function seedBanks() {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  const existingItems = await db
    .select({ name: banks.name })
    .from(banks)
    .where(eq(banks.userId, session.user.id));

  const existingNames = new Set(existingItems.map(i => i.name.toLowerCase()));

  const toInsert = defaultBanks.filter(name => !existingNames.has(name.toLowerCase()));

  if (toInsert.length === 0) {
    return { message: 'Banques déjà à jour', count: 0 };
  }

  const inserted = await db
    .insert(banks)
    .values(
      toInsert.map(name => ({
        userId: session.user.id,
        name,
      }))
    )
    .returning();

  console.log('[seedBanks] Inserted:', inserted.length);
  return { message: `Importation réussie (${inserted.length} ajoutés)`, count: inserted.length };
}

/**
 * Seed all settings at once
 */
export async function seedAllSettings() {
  const results = await Promise.all([
    seedCategories(),
    seedBrands(),
    seedColors(),
    seedMaterials(),
    seedTreatments(),
    seedInsurances(),
    seedMountingTypes(),
    seedBanks(),
  ]);

  const totalCount = results.reduce((sum, r) => sum + r.count, 0);

  return {
    message: 'Tous les paramètres ont été importés',
    count: totalCount,
    details: results,
  };
}

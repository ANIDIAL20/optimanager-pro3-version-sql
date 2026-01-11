/**
 * Global Category Icon Mapping Utility
 * 
 * This ensures strict consistency of category icons across the entire application.
 * Icons are from lucide-react.
 */

import {
    Glasses,
    Disc,
    Eye,
    SprayCan,
    Link,
    Briefcase,
    Puzzle,
    Wrench,
    Layers,
    LayoutGrid,
    Package,
    type LucideIcon,
} from 'lucide-react';

/**
 * The Golden Rule Icon Map
 * Use these exact icons everywhere in the app for consistency
 */
export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
    // Primary product categories
    'montures': Glasses,
    'verres': Disc,
    'lentilles': Eye,
    'lentilles de contact': Eye,

    // Accessories & supplies
    "produits d'entretien": SprayCan,
    'cordons': Link,
    'etuis': Briefcase,
    'étuis': Briefcase,
    'accessoires': Puzzle,

    // Equipment & misc
    'materiel': Wrench,
    'matériel': Wrench,
    'divers': Layers,

    // Special values
    'all': LayoutGrid,
    'tout': LayoutGrid,
};

/**
 * Get the icon component for a category name
 * @param categoryName - The category name (case-insensitive)
 * @returns The Lucide icon component
 */
export function getCategoryIcon(categoryName: string): LucideIcon {
    const normalized = categoryName.toLowerCase().trim();

    // Direct match
    if (CATEGORY_ICON_MAP[normalized]) {
        return CATEGORY_ICON_MAP[normalized];
    }

    // Fuzzy match (contains)
    for (const [key, icon] of Object.entries(CATEGORY_ICON_MAP)) {
        if (normalized.includes(key) || key.includes(normalized)) {
            return icon;
        }
    }

    // Default fallback
    return Package;
}

/**
 * Get all available category icon mappings
 * Useful for displaying all categories with their icons
 */
export function getAllCategoryIcons(): Array<{ name: string; icon: LucideIcon }> {
    return Object.entries(CATEGORY_ICON_MAP)
        .filter(([name]) => name !== 'all' && name !== 'tout')
        .map(([name, icon]) => ({ name, icon }));
}

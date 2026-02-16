// ====================================
// 🧮 TVA HELPERS - OptiManager Pro 3
// ====================================
//
// Purpose: Calculate HT, TVA, and TTC prices with robust edge case handling
// Author: AI Agent
// Date: 2026-02-15
//
// ====================================

/**
 * Morocco VAT rate (20%)
 * @constant
 */
const TVA_RATE = 0.20;

/**
 * Maximum reasonable price in DH (1 million)
 * Prices above this trigger warnings
 * @constant
 */
const MAX_REASONABLE_PRICE = 1_000_000;

/**
 * Minimum price threshold in DH (1 centime)
 * Prices below this (but > 0) trigger warnings
 * @constant
 */
const MIN_PRICE_THRESHOLD = 0.01;

/**
 * Tolerance for floating point comparisons (2 centimes)
 * @constant
 */
const FLOAT_TOLERANCE = 0.02;

// ====================================
// TYPES
// ====================================

/**
 * Input for price calculation
 */
export interface PriceInput {
  /** The amount entered by the user */
  amount: number;
  /** Whether the amount is HT (before tax) or TTC (including tax) */
  type: 'HT' | 'TTC';
  /** Whether the product is subject to VAT */
  hasTva: boolean;
}

export const VAT_RATES = {
  STANDARD: 0.20,
  EXEMPT: 0.00
};

export const VAT_EXEMPT_CATEGORIES = ['Medical'];

/**
 * Checks if a category should be VAT exempt (0%)
 */
export const isCategoryVatExempt = (categoryName?: string): boolean => {
  if (!categoryName) return false;
  const normalized = categoryName.trim();
  return VAT_EXEMPT_CATEGORIES.some(c => 
    normalized.toLowerCase() === c.toLowerCase() || 
    normalized.toLowerCase() + 's' === c.toLowerCase()
  );
};


/**
 * Result of price calculation
 */
export interface PriceBreakdown {
  /** Price without VAT (base taxable) */
  ht: number;
  /** VAT amount (0 if exempted) */
  tva: number;
  /** Final price including VAT */
  ttc: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether the input is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Warning message (non-blocking) */
  warning?: string;
}

// ====================================
// VALIDATION
// ====================================

/**
 * Validates price input before calculation
 * 
 * @param input - The price input to validate
 * @returns Validation result with error/warning messages
 * 
 * @example
 * ```typescript
 * const result = validatePriceInput({ amount: -100, type: 'TTC', hasTva: true });
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 * ```
 */
export function validatePriceInput(input: PriceInput): ValidationResult {
  // ✅ EDGE CASE 1: Type validation
  if (typeof input.amount !== 'number') {
    return {
      valid: false,
      error: 'Le prix doit être un nombre'
    };
  }

  // ✅ EDGE CASE 2: NaN detection
  if (isNaN(input.amount)) {
    return {
      valid: false,
      error: 'Le prix est invalide (NaN)'
    };
  }

  // ✅ EDGE CASE 3: Infinity detection
  if (!isFinite(input.amount)) {
    return {
      valid: false,
      error: 'Le prix ne peut pas être infini'
    };
  }

  // ✅ EDGE CASE 4: Negative prices
  if (input.amount < 0) {
    return {
      valid: false,
      error: 'Le prix ne peut pas être négatif'
    };
  }

  // ✅ EDGE CASE 5: Zero price (free product)
  if (input.amount === 0) {
    return {
      valid: true,
      warning: 'Prix à zéro détecté (produit gratuit)'
    };
  }

  // ✅ EDGE CASE 6: Very small prices (< 1 centime)
  if (input.amount > 0 && input.amount < MIN_PRICE_THRESHOLD) {
    return {
      valid: true,
      warning: `Prix très faible détecté (${input.amount} DH < ${MIN_PRICE_THRESHOLD} DH)`
    };
  }

  // ✅ EDGE CASE 7: Unusually high prices
  if (input.amount > MAX_REASONABLE_PRICE) {
    return {
      valid: true,
      warning: `Prix inhabituellement élevé détecté (${input.amount.toLocaleString()} DH)`
    };
  }

  // ✅ EDGE CASE 8: Invalid price type
  if (input.type !== 'HT' && input.type !== 'TTC') {
    return {
      valid: false,
      error: `Type de prix invalide: "${input.type}". Doit être "HT" ou "TTC"`
    };
  }

  // ✅ EDGE CASE 9: Invalid hasTva type
  if (typeof input.hasTva !== 'boolean') {
    return {
      valid: false,
      error: 'hasTva doit être un booléen (true/false)'
    };
  }

  return { valid: true };
}

// ====================================
// CALCULATION
// ====================================

// Utility for financial rounding to 2 decimal places
export function round2(num: number): number {
  // ✅ EDGE CASE 14: Handle non-numbers
  if (typeof num !== 'number' || isNaN(num)) {
    console.warn(`[TVA Helper] round2 received invalid input: ${num}`);
    return 0;
  }

  // ✅ EDGE CASE 15: Handle infinity
  if (!isFinite(num)) {
    console.warn(`[TVA Helper] round2 received infinite value: ${num}`);
    return 0;
  }

  // Use Number.EPSILON to handle floating point precision
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates HT, TVA, and TTC from user input
 * 
 * Handles all edge cases including:
 * - Zero prices (free products)
 * - Very small/large amounts
 * - Rounding precision
 * - Exempted products (no VAT)
 * 
 * @param input - Price input with amount, type, and VAT status
 * @returns Price breakdown with HT, TVA, and TTC
 * @throws {Error} If input is invalid
 * 
 * @example
 * ```typescript
 * // Example 1: TTC to HT conversion (with VAT)
 * const result = calculatePrices({ amount: 1200, type: 'TTC', hasTva: true });
 * // → { ht: 1000, tva: 200, ttc: 1200 }
 * 
 * // Example 2: HT to TTC conversion (with VAT)
 * const result = calculatePrices({ amount: 1000, type: 'HT', hasTva: true });
 * // → { ht: 1000, tva: 200, ttc: 1200 }
 * 
 * // Example 3: Exempted product (no VAT)
 * const result = calculatePrices({ amount: 500, type: 'TTC', hasTva: false });
 * // → { ht: 500, tva: 0, ttc: 500 }
 * ```
 */
export function calculatePrices(
  amountOrInput: number | PriceInput, 
  type: 'HT' | 'TTC' = 'TTC', 
  hasTva: boolean = true
): PriceBreakdown {
  
  // Normalize input to PriceInput object interface for backward compatibility
  let input: PriceInput;
  if (typeof amountOrInput === 'number') {
    input = { amount: amountOrInput, type, hasTva };
  } else {
    input = amountOrInput;
  }

  // Validate input
  const validation = validatePriceInput(input);
  
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Log warnings (non-blocking)
  if (validation.warning && process.env.NODE_ENV === 'development') {
    console.warn(`[TVA Helper] ${validation.warning}`);
  }

  // ✅ EDGE CASE 10: Zero price (free product)
  if (input.amount === 0) {
    return { ht: 0, tva: 0, ttc: 0 };
  }

  // ✅ EDGE CASE 11: Exempted products (no VAT)
  if (!input.hasTva) {
    const price = round2(input.amount);
    return {
      ht: price,
      tva: 0,
      ttc: price
    };
  }

  // ✅ STANDARD CASE: Calculate with VAT (20%)
  let ht: number;
  let tva: number;
  let ttc: number;

  if (input.type === 'TTC') {
    // User entered TTC → Extract HT
    ttc = input.amount;
    ht = ttc / (1 + TVA_RATE);  // TTC / 1.20
    tva = ttc - ht;
  } else {
    // User entered HT → Calculate TTC
    ht = input.amount;
    tva = ht * TVA_RATE;
    ttc = ht + tva;
  }

  // ✅ EDGE CASE 12: Round to 2 decimals (avoid floating point errors)
  ht = round2(ht);
  tva = round2(tva);
  ttc = round2(ttc);

  // ✅ EDGE CASE 13: Verify coherence (HT + TVA = TTC)
  const calculatedTTC = round2(ht + tva);
  const difference = Math.abs(calculatedTTC - ttc);

  if (difference > FLOAT_TOLERANCE) {
    // This should never happen because we round2 each component, but guard against calculation bugs
    console.error('[TVA Helper] Coherence check failed:', {
      ht,
      tva,
      ttc,
      calculated: calculatedTTC,
      difference
    });
    
    // Auto-correct to ensure mathematical consistency
    // Trust TTC as source of truth if type was TTC, else adjust
    if (input.type === 'TTC') {
        tva = round2(ttc - ht);
    } else {
        ttc = round2(ht + tva);
    }
  }

  return { ht, tva, ttc };
}

// Alias for backward compatibility if needed, though calculatePrices handles it now
export const calculateFromTTC = (ttc: number, hasTva: boolean = true, rate: number = 0.20): PriceBreakdown => {
  return calculatePrices({ amount: ttc, type: 'TTC', hasTva });
};

export const calculateFromHT = (ht: number, hasTva: boolean = true, rate: number = 0.20): PriceBreakdown => {
  return calculatePrices({ amount: ht, type: 'HT', hasTva });
};


// ====================================
// UTILITIES
// ====================================

/**
 * Checks if two prices are equal within tolerance
 * 
 * Useful for comparing calculated vs stored prices
 * 
 * @param a - First price
 * @param b - Second price
 * @param tolerance - Maximum acceptable difference (default: 0.02 DH)
 * @returns True if prices are equal within tolerance
 * 
 * @example
 * ```typescript
 * pricesEqual(100.00, 100.01, 0.02)  // → true
 * pricesEqual(100.00, 100.10, 0.02)  // → false
 * ```
 */
export function pricesEqual(
  a: number, 
  b: number, 
  tolerance: number = FLOAT_TOLERANCE
): boolean {
  return Math.abs(a - b) <= tolerance;
}

/**
 * Formats a price for display
 * 
 * @param price - Price to format
 * @param currency - Currency symbol (default: 'DH')
 * @returns Formatted price string
 * 
 * @example
 * ```typescript
 * formatPrice(1234.56)     // → "1,234.56 DH"
 * formatPrice(1000, '€')   // → "1,000.00 €"
 * ```
 */
export function formatPrice(price: number, currency: string = 'DH'): string {
  if (typeof price !== 'number' || isNaN(price)) {
    return `0.00 ${currency}`;
  }

  return `${price.toLocaleString('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} ${currency}`;
}

/**
 * Calculates VAT rate from HT and TVA amounts
 * 
 * Useful for verification or reports
 * 
 * @param ht - Price without VAT
 * @param tva - VAT amount
 * @returns VAT rate as percentage (0-100)
 * 
 * @example
 * ```typescript
 * calculateVatRate(1000, 200)  // → 20
 * calculateVatRate(500, 0)     // → 0
 * ```
 */
export function calculateVatRate(ht: number, tva: number): number {
  // ✅ EDGE CASE 16: Division by zero
  if (ht === 0) {
    return 0;
  }

  const rate = (tva / ht) * 100;
  return round2(rate);
}

// ====================================
// CONSTANTS EXPORT
// ====================================

/**
 * Exported constants for use throughout the app
 */
export const TVA_CONSTANTS = {
  /** Morocco standard VAT rate (20%) */
  RATE: TVA_RATE,
  
  /** Maximum reasonable price for warnings */
  MAX_PRICE: MAX_REASONABLE_PRICE,
  
  /** Minimum price threshold */
  MIN_PRICE: MIN_PRICE_THRESHOLD,
  
  /** Tolerance for float comparisons */
  TOLERANCE: FLOAT_TOLERANCE,
  
  /** Rate as percentage for display */
  RATE_PERCENT: TVA_RATE * 100
} as const;

/**
 * Calculates detailed tax breakdown for a line item
 */
export function calculateLineItem(
  unitPriceInput: number, 
  quantity: number, 
  isTTC: boolean = true, 
  hasTva: boolean = true
) {
  const result = calculatePrices(
    { amount: unitPriceInput, type: isTTC ? 'TTC' : 'HT', hasTva }
  );

  return {
    unitHT: result.ht,
    unitTVA: result.tva,
    unitTTC: result.ttc,
    totalHT: round2(result.ht * quantity),
    totalTVA: round2(result.tva * quantity),
    totalTTC: round2(result.ttc * quantity),
    rate: hasTva ? 20 : 0
  };
}

const n2words = require('n2words');

/**
 * Converts a currency amount to words in French (Moroccan Dirham format)
 * 
 * @param amount - The amount to convert
 * @returns The amount in words (e.g., "Cent cinquante Dirhams et cinquante Centimes")
 * 
 * @example
 * formatCurrencyToWords(150.00) // "Cent cinquante Dirhams"
 * formatCurrencyToWords(150.50) // "Cent cinquante Dirhams et cinquante Centimes"
 * formatCurrencyToWords(1.00) // "Un Dirham"
 * formatCurrencyToWords(0.50) // "Cinquante Centimes"
 */
export function formatCurrencyToWords(amount: number): string {
  // Handle invalid input
  if (isNaN(amount) || amount < 0) {
    return 'Montant invalide';
  }

  // Split into integer and decimal parts
  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);

  let result = '';

  // Convert integer part (Dirhams)
  if (integerPart > 0) {
    const dirhamsInWords = n2words(integerPart, { lang: 'fr' });
    // Capitalize first letter
    const capitalizedDirhams = dirhamsInWords.charAt(0).toUpperCase() + dirhamsInWords.slice(1);
    
    // Use singular "Dirham" for 1, plural "Dirhams" for others
    const dirhamLabel = integerPart === 1 ? 'Dirham' : 'Dirhams';
    result = `${capitalizedDirhams} ${dirhamLabel}`;
  }

  // Convert decimal part (Centimes)
  if (decimalPart > 0) {
    const centimesInWords = n2words(decimalPart, { lang: 'fr' });
    // Capitalize first letter
    const capitalizedCentimes = centimesInWords.charAt(0).toUpperCase() + centimesInWords.slice(1);
    
    // Use singular "Centime" for 1, plural "Centimes" for others
    const centimeLabel = decimalPart === 1 ? 'Centime' : 'Centimes';
    
    if (result) {
      result += ` et ${capitalizedCentimes} ${centimeLabel}`;
    } else {
      result = `${capitalizedCentimes} ${centimeLabel}`;
    }
  }

  // Handle exact zero
  if (!result) {
    result = 'Zéro Dirham';
  }

  return result;
}

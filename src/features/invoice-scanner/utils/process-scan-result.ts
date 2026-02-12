
/**
 * Processes the raw AI scan results for products.
 * Handles auto-generation of product names if missing.
 * 
 * @param products - Array of product objects from AI extraction
 * @returns Array of products with processed names and metadata
 */
export function processAIScanResult(products: any[]) {
  return products.map((p) => {
    // Check if name is missing (supporting multiple possible field names from AI/mappings)
    let nom = p.name || p.nom || p.nomProduit;
    let isNameGenerated = false;

    if (!nom || nom.trim() === "") {
      const reference = p.reference || "";
      const couleur = p.couleur || p.color || "";
      
      // Format: reference + " " + couleur
      nom = `${reference} ${couleur}`.trim();
      
      // If both are empty, fallback to a placeholder or keep it empty
      if (!nom) {
        nom = "Produit sans nom";
      }
      
      isNameGenerated = true;
    }

    return {
      ...p,
      nomProduit: nom,
      name: nom, // Ensure both field variants are updated
      isNameGenerated
    };
  });
}

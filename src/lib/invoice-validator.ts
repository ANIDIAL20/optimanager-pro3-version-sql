// src/lib/invoice-validator.ts

export interface ExtractedProduct {
    name: string;
    quantity: number | null;
    unitPrice: number | null;
    total: number | null;
}

export interface InvoiceData {
    invoiceNumber: string | null;
    date: string | null;
    supplierName: string | null;
    total: number | null;
    currency: string | null;
    products: ExtractedProduct[];
}

export interface ValidationError {
    field: string;
    message: string;
}

export function validateInvoiceData(data: InvoiceData): {
    isValid: boolean;
    errors: ValidationError[];
} {
    const errors: ValidationError[] = [];

    if (!data.supplierName || data.supplierName.trim() === '') {
        errors.push({ field: 'supplierName', message: 'Nom du fournisseur manquant ou illisible.' });
    }

    if (!data.products || data.products.length === 0) {
        errors.push({ field: 'products', message: 'Aucun produit détecté sur la facture.' });
    } else {
        data.products.forEach((product, index) => {
            if (!product.name || product.name.trim() === '') {
                errors.push({ field: `products[${index}].name`, message: `Produit #${index + 1}: Nom manquant.` });
            }

            if (product.quantity !== null && (product.quantity <= 0)) {
                errors.push({ field: `products[${index}].quantity`, message: `Produit #${index + 1}: Quantité doit être supérieure à 0.` });
            }

            if (product.unitPrice !== null && (product.unitPrice < 0)) {
                errors.push({ field: `products[${index}].unitPrice`, message: `Produit #${index + 1}: Prix ne peut pas être négatif.` });
            }
        });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

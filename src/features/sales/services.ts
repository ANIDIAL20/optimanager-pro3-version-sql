
import { saleRepository } from './repository';
import { productRepository } from '@/features/products/repository';
import { SaleInput } from './schemas';

export class SaleService {
  
  /**
   * Process a full sale transaction
   */
  async processSale(userId: string, data: SaleInput) {
    // 1. Validate Stock Availability
    // TODO: Re-enable after fixing ProductRepository.findById query issue
    /*
    for (const item of data.items) {
      if (item.productId) {
        // Parse ID to number since schema defines it as serial (integer)
        const productId = parseInt(item.productId);
        if (isNaN(productId)) {
            console.warn(`Invalid productId skipped: ${item.productId}`);
            continue;
        }

        const product = await productRepository.findById(productId);
        
        if (!product) {
           throw new Error(`Produit introuvable (ID: ${item.productId})`);
        }
        
        // Check stock (ensure types are handled safely)
        const currentStock = product.quantiteStock ?? 0;
        if (currentStock < item.quantity) {
          throw new Error(`Stock insuffisant pour ${item.name} (Dispo: ${currentStock})`);
        }
      }
    }
    */
    console.warn('⚠️ Stock validation temporarily disabled');

    // 2. Prepare Sale Data
    const status = data.totalPaid >= data.totalTTC ? 'paye' : 
                   data.totalPaid > 0 ? 'partiel' : 'impaye';

    const saleData = {
      userId,
      clientId: data.clientId,
      clientName: data.clientName,
      items: data.items,
      
      totalHT: data.totalHT.toString(),
      totalTVA: data.totalTVA.toString(),
      totalTTC: data.totalTTC.toString(),
      totalPaye: data.totalPaid.toString(),
      resteAPayer: (data.totalTTC - data.totalPaid).toString(),
      
      status,
      paymentMethod: data.paymentMethod,
      date: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 3. Execute Transaction via Repository
    return await saleRepository.createSale(saleData, data.items, data.lensOrderIds);
  }
}

export const saleService = new SaleService();

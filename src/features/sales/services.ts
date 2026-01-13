
import { saleRepository } from './repository';
import { productRepository } from '@/features/products/repository';
import { SaleInput } from './schemas';

export class SaleService {
  
  /**
   * Process a full sale transaction
   */
  async processSale(userId: string, data: SaleInput) {
    // 1. Validate Stock Availability
    for (const item of data.items) {
      if (item.productId) {
        const product = await productRepository.findById(item.productId);
        if (product && product.quantiteStock !== null && product.quantiteStock < item.quantity) {
          throw new Error(`Stock insuffisant pour ${item.name} (Dispo: ${product.quantiteStock})`);
        }
      }
    }

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
    return await saleRepository.createSale(saleData, data.items);
  }
}

export const saleService = new SaleService();

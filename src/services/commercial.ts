'use client';

// Stubbed commercial service for SQL migration
// import { ... } from 'firebase/firestore'; 

export interface Company {
  name: string;
  type: 'supplier' | 'client';
  email?: string;
  phone: string;
  ice?: string;
  rc?: string;
  if?: string;
  creditBalance?: number;
}

export interface Product {
  name: string;
  sku: string;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  minStock: number;
}

export interface Purchase {
  supplierId: string;
  items: {
    productId: string;
    quantity: number;
    cost: number;
  }[];
  status: 'pending' | 'completed';
  totalAmount: number;
}

export interface Sale {
  clientId: string;
  items: {
    productId: string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  paymentMethod: 'cash' | 'bank' | 'credit';
  date: any; // was Timestamp
}

export async function createCompany(
  firestore: any,
  userId: string,
  companyData: Company
): Promise<any> {
    console.warn("createCompany is disabled during SQL migration");
    throw new Error("createCompany is disabled");
}

export async function confirmReception(
  firestore: any,
  purchaseId: string
): Promise<void> {
    console.warn("confirmReception is disabled during SQL migration");
    throw new Error("confirmReception is disabled");
}

export async function createSale(
  firestore: any,
  userId: string,
  saleData: any
): Promise<void> {
    console.warn("createSale is disabled during SQL migration");
    throw new Error("createSale is disabled");
}

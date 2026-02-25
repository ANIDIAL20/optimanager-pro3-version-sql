export type FrameReservationStatus = 
  | 'PENDING' 
  | 'COMPLETED' 
  | 'CANCELLED' 
  | 'EXPIRED';

export interface FrameReservationItem {
  productId: number;
  productName: string;
  reference: string | null;
  quantity: number;
  unitPrice: number;
}

export interface FrameReservation {
  id: number;
  storeId: string;
  clientId: number;
  clientName: string;
  status: FrameReservationStatus;
  items: FrameReservationItem[];
  reservationDate: Date;
  expiryDate: Date;
  totalAmount?: number;
  depositAmount?: number;
  remainingAmount?: number;
  completedAt?: Date | null;
  saleId?: number | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}


export interface CreateFrameReservationInput {
  storeId: string;
  clientId: number;
  clientName: string;
  items: { productId: number; quantity: number }[];
  expiryDays?: number;
  notes?: string;
}

export interface CompleteFrameReservationInput {
  reservationId: number;
  saleId: number;
}

export interface CancelFrameReservationInput {
  reservationId: number;
  reason?: string;
  setExpired?: boolean;
}

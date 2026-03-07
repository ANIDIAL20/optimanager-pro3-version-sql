
export * from './clients';
export * from './products';
export * from './sales';
export * from './lens-orders';
export * from './auth-core';
export * from './finance';
export * from './logs-misc';
export * from './relations';
export * from './suppliers.schema';
export * from './notifications';
export * from './expenses';
export * from './reminders';
export * from './supplier-credits';
export * from './goods-receipts';

// Types
import { prescriptions } from './clients';
import { notifications } from './notifications';

export type Prescription = typeof prescriptions.$inferSelect;
export type PrescriptionInsert = typeof prescriptions.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

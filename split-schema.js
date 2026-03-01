const fs = require('fs');

const lines = fs.readFileSync('src/db/schema.ts', 'utf8').split('\n');

function getBlock(start, end) {
  return lines.slice(start - 1, end).join('\n');
}

const imports = `import { pgTable, serial, text, timestamp, boolean, decimal, integer, json, jsonb, primaryKey, uuid, index, real, uniqueIndex } from 'drizzle-orm/pg-core';
import type { AdapterAccount } from "next-auth/adapters";
import { relations, sql } from 'drizzle-orm';
`;

// Note: I will put all relations in relations.ts to avoid circular dependencies!
// But wait, relations require importing ALL tables.
// Is it better to just put everything in domains and use a central import?
// The instructions say: "Replace ALL imports... AFTER: import { products } from '@/db/schema'".
// If I use export * from './schema/index' in src/db/schema.ts it will work.

const files = {
  'clients.ts': imports + getBlock(7, 76) + '\n' + getBlock(483, 524) + '\n' + getBlock(1186, 1224),
  'products.ts': imports + getBlock(77, 178) + '\n' + getBlock(864, 947),
  'sales.ts': imports + getBlock(179, 334) + '\n' + getBlock(335, 406) + '\n' + getBlock(1235, 1279),
  'lens-orders.ts': imports + getBlock(525, 627) + '\n' + getBlock(948, 983),
  'auth-core.ts': imports + getBlock(754, 863) + '\n' + getBlock(431, 482),
  'finance.ts': imports + getBlock(1003, 1026) + '\n' + getBlock(1117, 1144) + '\n' + getBlock(1145, 1185) + '\n' + getBlock(1280, 1301) + '\n' + getBlock(1074, 1091),
  'logs-misc.ts': imports + getBlock(1041, 1073) + '\n' + getBlock(407, 430) + '\n' + getBlock(735, 753),
};

const tablesList = [
    'clients', 'clientInteractions', 'prescriptions', 'prescriptionsLegacy', 'contactLensPrescriptions',
    'products', 'invoiceImports', 'brands', 'categories', 'materials', 'colors', 'treatments', 'mountingTypes', 'banks', 'insurances',
    'sales', 'saleItems', 'saleLensDetails', 'saleContactLensDetails', 'devis', 'reservations', 'frameReservations',
    'lensOrders', 'supplierOrderItems',
    'users', 'accounts', 'sessions', 'verificationTokens', 'settings', 'shopProfiles',
    'clientTransactions', 'expenses', 'cashSessions', 'cashMovements', 'comptabiliteJournal', 'purchases',
    'auditLog', 'auditLogs', 'stockMovements', 'reminders'
];

// Relation blocks:
// 631-734
// 1109-1116
// 1224-1231
// 1301-1323
let relationsBlock = imports + `\n
import { clients, clientInteractions, prescriptions, prescriptionsLegacy, contactLensPrescriptions } from './clients';
import { products, invoiceImports, brands, categories, materials, colors, treatments, mountingTypes, banks, insurances } from './products';
import { sales, saleItems, saleLensDetails, saleContactLensDetails, devis, reservations, frameReservations } from './sales';
import { lensOrders, supplierOrderItems } from './lens-orders';
import { users, accounts, sessions, verificationTokens, settings, shopProfiles } from './auth-core';
import { clientTransactions, expenses, cashSessions, cashMovements, comptabiliteJournal, purchases } from './finance';
import { auditLog, auditLogs, stockMovements, reminders } from './logs-misc';
import { suppliers, supplierOrders, supplierPayments, supplierOrderPayments } from './suppliers.schema';
import { notifications } from './notifications';
\n`;

relationsBlock += getBlock(70, 75) + '\n';
relationsBlock += getBlock(631, 734) + '\n';
relationsBlock += getBlock(1109, 1115) + '\n';
relationsBlock += getBlock(1225, 1230) + '\n';
relationsBlock += getBlock(1302, 1322) + '\n';
relationsBlock += getBlock(1331, 1339) + '\n';

files['relations.ts'] = relationsBlock;

// Create src/db/schema folder if not exists
if (!fs.existsSync('src/db/schema')) {
    fs.mkdirSync('src/db/schema', { recursive: true });
}

for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync('src/db/schema/' + name, content);
}

// Write index.ts
let indexTs = `
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
export * from './plans';

// Types
import { prescriptions } from './clients';
import { notifications } from './notifications';

export type Prescription = typeof prescriptions.$inferSelect;
export type PrescriptionInsert = typeof prescriptions.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
`;
fs.writeFileSync('src/db/schema/index.ts', indexTs);

fs.writeFileSync('src/db/schema.ts', `// DEPRECATED: use src/db/schema/index.ts
export * from './schema/index';
`);

console.log('Schema split successful!');

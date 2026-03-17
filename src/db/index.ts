import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzleWs } from 'drizzle-orm/neon-serverless';
import * as schemaFile from './schema';
import * as schemaDir from './schema/index';

const schema = { ...schemaFile, ...schemaDir };

// ✅ HTTP client — للـ queries العادية (أسرع)
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzleHttp(sql, { schema });

// ✅ WebSocket Pool — للـ transactions فقط
import ws from 'ws';
neonConfig.webSocketConstructor = ws; // ← import عادي وليس eval()
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const dbWithTransactions = drizzleWs({ client: pool, schema });
import ws from 'ws'; // ← import نظيف، بدون eval أبداً
import { neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schemaFile from './schema';
import * as schemaDir from './schema/index';

neonConfig.webSocketConstructor = ws; // ← سطر واحد فقط، خارج أي if/eval

const schema = { ...schemaFile, ...schemaDir };
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const db = drizzle({ client: pool, schema });
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schemaFile from './schema';
import * as schemaDir from './schema/index';

const schema = { ...schemaFile, ...schemaDir };

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
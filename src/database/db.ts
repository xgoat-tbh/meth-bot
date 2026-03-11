import { DatabaseSync } from 'node:sqlite';
import * as path from 'path';
import * as fs from 'fs';
import { config } from '../config';
import { SCHEMA_SQL, SHOP_SEED_SQL, SHOP_PERK_UPDATE_SQL } from './schema';
import { logger } from '../utils/logger';

const dbPath = path.resolve(process.cwd(), config.DATABASE_PATH);
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (dbInstance) return dbInstance;

  dbInstance = new DatabaseSync(dbPath);
  dbInstance.exec('PRAGMA journal_mode = WAL');
  dbInstance.exec('PRAGMA foreign_keys = ON');
  dbInstance.exec('PRAGMA synchronous = NORMAL');
  dbInstance.exec(SCHEMA_SQL);
  dbInstance.exec(SHOP_SEED_SQL);
  dbInstance.exec(SHOP_PERK_UPDATE_SQL);

  logger.info(`Database initialised at ${dbPath}`);
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    logger.info('Database connection closed');
  }
}

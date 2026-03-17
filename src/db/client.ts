import Database from "better-sqlite3";
import { schema } from "./schema.js";
import { join } from "path";
import { mkdirSync } from "fs";

const DATA_DIR = join(process.cwd(), "src/data/");
const DB_PATH = join(DATA_DIR, "mty-transit.db");

mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.exec(schema);

export { DATA_DIR };

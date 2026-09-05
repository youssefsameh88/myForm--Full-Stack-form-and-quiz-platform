import pg from "pg";
import "dotenv/config";

const db = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

db.connect();

export default db;

import pg from "pg"


const config = {
    user: "postgres",
    host: "localhost",
    database: "myform",
    password: "youssef123",
    port: 5432
};
const db = new pg.Client(config);
db.connect();
export default db;

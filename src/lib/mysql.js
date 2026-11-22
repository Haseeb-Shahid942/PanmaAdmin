// /src/lib/mysql.js
import mysql from "mysql2/promise";

// Connection settings come only from environment variables (injected by hosting):
// DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
const globalForMysql = globalThis;

export const mysqlPool =
  globalForMysql.mysqlPool ||
  mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    supportBigNumbers: true,
    dateStrings: true,
  });

globalForMysql.mysqlPool = mysqlPool;

export default mysqlPool;

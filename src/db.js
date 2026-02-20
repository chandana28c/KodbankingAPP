const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'sql.freedb.tech',
  port: 3306,
  user: 'freedb_chandana',
  password: 'd&V7u$pJ7BqkKD4',
  database: 'freedb_Kodbanking',
  // FreeDB typically does not require client-side SSL configuration.
  connectionLimit: 10,
});

async function initSchema() {
  const createKodUser = `
    DROP TABLE IF EXISTS UserToken;
  `;

  const dropKodUser = `
    DROP TABLE IF EXISTS KodUser;
  `;

  const createKodUserTable = `
    CREATE TABLE KodUser (
      uid INT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      balance DECIMAL(15,2) NOT NULL DEFAULT 100000.00,
      phone VARCHAR(20),
      role ENUM('Customer', 'manager', 'admin') NOT NULL DEFAULT 'Customer'
    );
  `;

  const createUserTokenTable = `
    CREATE TABLE UserToken (
      tid INT AUTO_INCREMENT PRIMARY KEY,
      token TEXT NOT NULL,
      uid INT NOT NULL,
      expiry DATETIME NOT NULL,
      FOREIGN KEY (uid) REFERENCES KodUser(uid) ON DELETE CASCADE
    );
  `;

  const conn = await pool.getConnection();
  try {
    await conn.query(createKodUser);
    await conn.query(dropKodUser);
    await conn.query(createKodUserTable);
    await conn.query(createUserTokenTable);
    console.log('Database schema initialized (KodUser, UserToken).');
  } finally {
    conn.release();
  }
}

module.exports = {
  pool,
  initSchema,
};


const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function testConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Connecting to:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
    await client.connect();
    console.log('Connected successfully!');
    const res = await client.query('SELECT current_database(), current_schema();');
    console.log('DB Info:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Connection error:', err.message);
    process.exit(1);
  }
}

testConnection();

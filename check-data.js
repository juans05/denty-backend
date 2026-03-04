const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL.split('?')[0],
    // ssl: { rejectUnauthorized: false } // Server doesn't support SSL apparently
});

async function checkData() {
    try {
        await client.connect();
        console.log('Connected to DB');

        // Explicitly select from the schema
        const res = await client.query('SELECT * FROM "dbDental"."User"');
        console.log('Users found:', res.rows);

    } catch (err) {
        console.error('Error querying data:', err);
    } finally {
        await client.end();
    }
}

checkData();

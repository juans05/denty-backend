const { Client } = require('pg');
require('dotenv').config();

// Strip existing query params to ensure clean slate
const cleanUrl = process.env.DATABASE_URL.split('?')[0];

const client = new Client({
    connectionString: cleanUrl,
    // No SSL object, as server does not support it
});

async function checkDb() {
    console.log('Connecting to (no SSL):', cleanUrl.replace(/:[^:]*@/, ':****@'));
    try {
        await client.connect();
        console.log('Connected!');

        // Check Schemas
        const schemas = await client.query("SELECT schema_name FROM information_schema.schemata;");
        const schemaNames = schemas.rows.map(r => r.schema_name);
        console.log('Schemas:', schemaNames);

        if (!schemaNames.includes('dbDental')) {
            console.log("Schema 'dbDental' NOT found. Attempting to create...");
            try {
                await client.query("CREATE SCHEMA \"dbDental\";");
                console.log("Schema 'dbDental' created successfully.");
            } catch (schemaErr) {
                console.error("Failed to create schema 'dbDental':", schemaErr.message);
            }
        }

        // Check Tables in dbDental
        const tablesDental = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'dbDental';");
        console.log('Tables in dbDental:', tablesDental.rows.map(r => r.table_name));

        // Check Tables in public
        const tablesPublic = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
        console.log('Tables in public:', tablesPublic.rows.map(r => r.table_name));

    } catch (err) {
        console.error('Connection Error:', err.message);
    } finally {
        await client.end();
    }
}

checkDb();

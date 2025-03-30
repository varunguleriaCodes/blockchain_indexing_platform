import { Client } from 'pg';
import prisma from '../lib/prisma';

interface PostgresConnection {
  id: number;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  schema?: string;
  ssl: boolean;
}

interface InsertDataParams {
  connectionId: number;
  userId: number;
  table: string;
  data: Record<string, unknown>[];
}

export async function insertData({ connectionId, userId, table, data }: InsertDataParams) {
  const connection = await prisma.postgresConnection.findFirst({
    where: { id: connectionId, userId }
  });

  if (!connection) {
    throw new Error('Connection not found');
  }

  const client = new Client({
    host: connection.host,
    port: connection.port,
    database: connection.database,
    user: connection.username,
    password: connection.password,
    ssl: connection.ssl ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();

    const schemaTable = connection.schema ? `${connection.schema}.${table}` : table;

    // Ensure data is always an array
    const rows = Array.isArray(data) ? data : [data];

    // Extract column names dynamically
    const columns = Object.keys(rows[0]).map(col => `"${col}"`);
    
    // Check if table exists
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = $1 AND table_name = $2
      );
    `;
    
    const tableExistsResult = await client.query(tableExistsQuery, [
      connection.schema || 'public', 
      table
    ]);
    const tableExists = tableExistsResult.rows[0].exists;

    // If the table doesn't exist, create it dynamically
    if (!tableExists) {
      const columnDefinitions = Object.keys(rows[0])
        .map(col => `"${col}" ${col === "eventTime" ? "TIMESTAMP" : "TEXT"}`)
        .join(', ');

      const createTableQuery = `CREATE TABLE ${schemaTable} (${columnDefinitions});`;
      await client.query(createTableQuery);
    }

    // Prepare INSERT query
    const valuesPlaceholder = rows.map(
      (_, rowIndex) => `(${columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(', ')})`
    ).join(', ');

    const flattenedValues = rows.flatMap(row => Object.values(row));

    const insertQuery = `
      INSERT INTO ${schemaTable} (${columns.join(', ')})
      VALUES ${valuesPlaceholder}
      RETURNING *;
    `;

    // Execute the query
    const result = await client.query(insertQuery, flattenedValues);
    return result.rows;
  } finally {
    await client.end();
  }
}
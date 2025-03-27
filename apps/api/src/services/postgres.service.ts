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
    where: {
      id: connectionId,
      userId
    }
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

    // Check if the table exists
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = $1 AND table_name = $2
      );
    `;
    
    const tableExistsResult = await client.query(tableExistsQuery, [
      connection.schema || 'public', 
      table
    ]);

    const tableExists = tableExistsResult.rows[0].exists;

    // If the table does not exist, create it
    if (!tableExists) {
      // Generate column definitions from the data
      const columns = Object.keys(data[0])
        .map(col => `"${col}" TEXT`) // Change TEXT to appropriate data types if necessary
        .join(', ');

      const createTableQuery = `
        CREATE TABLE ${schemaTable} (${columns});
      `;

      await client.query(createTableQuery);
    }

    // Get column names from the data
    const columns = Object.keys(data[0]);
    const values = data.map((row: Record<string, unknown>) => Object.values(row));
    
    // Create the query
    const query = `
      INSERT INTO ${schemaTable} (${columns.join(', ')})
      VALUES ${values.map((_: unknown[], i: number) => 
        `(${columns.map((_: string, j: number) => `$${i * columns.length + j + 1}`).join(', ')})`
      ).join(', ')}
      RETURNING *;
    `;

    // Flatten values array for the query
    const flattenedValues = values.flat();

    // Execute the query
    const result = await client.query(query, flattenedValues);
    return result.rows;
  } finally {
    await client.end();
  }
} 
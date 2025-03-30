import { Pool } from 'pg';
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
  try {
    // Get connection details from database
    const connection = await prisma.postgresConnection.findUnique({
      where: { id: connectionId }
    });

    if (!connection) {
      throw new Error('Database connection not found');
    }

    // Create connection pool
    const pool = new Pool({
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.username,
      password: connection.password,
    });

    // Check if table has a primary key
    const primaryKeyQuery = `
      SELECT c.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name)
      JOIN information_schema.columns AS c ON c.table_schema = tc.constraint_schema
        AND tc.table_name = c.table_name AND ccu.column_name = c.column_name
      WHERE constraint_type = 'PRIMARY KEY' AND tc.table_name = $1;
    `;
    const primaryKeyResult = await pool.query(primaryKeyQuery, [table]);
    const primaryKey = primaryKeyResult.rows[0]?.column_name;

    // If no primary key exists, add one
    if (!primaryKey) {
      const addPrimaryKeyQuery = `
        ALTER TABLE ${table} 
        ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;
      `;
      await pool.query(addPrimaryKeyQuery);
    }

    // Insert data with primary key handling
    for (const row of data) {
      const columns = Object.keys(row);
      const values = Object.values(row);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

      // If primary key exists, use UPSERT
      if (primaryKey) {
        const updateColumns = columns.filter(col => col !== primaryKey);
        const updateSet = updateColumns.map(col => `${col} = EXCLUDED.${col}`).join(', ');
        
        const query = `
          INSERT INTO ${table} (${columns.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (${primaryKey})
          DO UPDATE SET ${updateSet}
        `;
        await pool.query(query, values);
      } else {
        // Regular insert with UUID
        const query = `
          INSERT INTO ${table} (id, ${columns.join(', ')})
          VALUES (gen_random_uuid(), ${placeholders})
        `;
        await pool.query(query, values);
      }
    }

    await pool.end();
    return { success: true };
  } catch (error) {
    console.error('Error inserting data:', error);
    throw error;
  }
}
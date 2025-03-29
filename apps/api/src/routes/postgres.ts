import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import router from '../lib/router';
import { auth } from '../middleware/auth';
import { Client } from 'pg';

// Add PostgreSQL connection
router.post('/connections', auth, async (req: any, res: Response): Promise<void> => {
  try {
    const { name, host, port, database, username, password, schema, ssl } = req.body;
    const userId = req.user.userId;

    // Test the connection before saving
    const client = new Client({
      host,
      port,
      database,
      user: username,
      password,
      ssl: ssl ? { rejectUnauthorized: false } : false
    });

    await client.connect();
    await client.end();

    // Save the connection details
    const connection = await prisma.postgresConnection.create({
      data: {
        name,
        host,
        port,
        database,
        username,
        password,
        schema,
        ssl,
        userId
      }
    });

    res.status(201).json(connection);
  } catch (error) {
    res.status(400).json({ error: 'Failed to connect to PostgreSQL database' });
  }
});

// Get all connections for the user
router.get('/connections', auth, async (req: any, res: Response): Promise<void> => {
  try {
    const connections = await prisma.postgresConnection.findMany({
      where: { userId: req.user.userId },
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        database: true,
        schema: true,
        ssl: true,
        createdAt: true,
        updatedAt: true
      }
    });
    res.json(connections);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

// Test a connection
router.post('/connections/:id/test', auth, async (req: any, res: Response): Promise<void> => {
  try {
    const connection = await prisma.postgresConnection.findFirst({
      where: {
        id: parseInt(req.params.id),
        userId: req.user.userId
      }
    });

    if (!connection) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    const client = new Client({
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.username,
      password: connection.password,
      ssl: connection.ssl ? { rejectUnauthorized: false } : false
    });

    await client.connect();
    await client.end();

    res.json({ message: 'Connection successful' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to connect to database' });
  }
});

// Insert data into a user's PostgreSQL database
router.post('/connections/:id/data', auth, async (req: any, res: Response): Promise<void> => {
  try {
    const { table, data } = req.body;
    const connection = await prisma.postgresConnection.findFirst({
      where: {
        id: parseInt(req.params.id),
        userId: req.user.userId
      }
    });

    if (!connection) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    const client = new Client({
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.username,
      password: connection.password,
      ssl: connection.ssl ? { rejectUnauthorized: false } : false
    });

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
      VALUES ${values.map((_: any, i: number) => `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(', ')})`).join(', ')}
      RETURNING *;
    `;

    // Flatten values array for the query
    const flattenedValues = values.flat();

    // Execute the query
    const result = await client.query(query, flattenedValues);
    await client.end();

    res.status(201).json({
      message: 'Data inserted successfully',
      insertedRows: result.rows
    });
} catch (error) {
    console.error('Error inserting data:', error);
    res.status(400).json({ 
      error: 'Failed to insert data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
}

});

// Get available tables for a connection
router.get('/connections/:id/tables', auth, async (req: any, res: Response): Promise<void> => {
  try {
    const connection = await prisma.postgresConnection.findFirst({
      where: {
        id: parseInt(req.params.id),
        userId: req.user.userId
      }
    });

    if (!connection) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    const client = new Client({
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.username,
      password: connection.password,
      ssl: connection.ssl ? { rejectUnauthorized: false } : false
    });

    await client.connect();

    const schema = connection.schema || 'public';
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const result = await client.query(query, [schema]);
    await client.end();

    const tables = result.rows.map(row => row.table_name);
    res.json({ tables });
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

// Get data from a specific table
router.get('/connections/:id/tables/:tableName/data', auth, async (req: any, res: Response): Promise<void> => {
  try {
    const connection = await prisma.postgresConnection.findFirst({
      where: {
        id: parseInt(req.params.id),
        userId: req.user.userId
      }
    });

    if (!connection) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    const client = new Client({
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.username,
      password: connection.password,
      ssl: connection.ssl ? { rejectUnauthorized: false } : false
    });

    await client.connect();

    const schema = connection.schema || 'public';
    const tableName = req.params.tableName;
    
    // First verify the table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = $1 
        AND table_name = $2
      );
    `, [schema, tableName]);

    if (!tableCheck.rows[0].exists) {
      await client.end();
      res.status(404).json({ error: 'Table not found' });
      return;
    }

    // Fetch the data with a limit
    const query = `
      SELECT * FROM ${schema}.${tableName}
      LIMIT 100;
    `;
    
    const result = await client.query(query);
    await client.end();

    res.json({ rows: result.rows });
  } catch (error) {
    console.error('Error fetching table data:', error);
    res.status(500).json({ error: 'Failed to fetch table data' });
  }
});

export default router; 
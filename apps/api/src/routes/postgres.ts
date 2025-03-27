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

    // Get column names from the data
    const columns = Object.keys(data[0]);
    const values = data.map((row: Record<string, unknown>) => Object.values(row));
    
    // Create the query
    const query = `
      INSERT INTO ${connection.schema ? `${connection.schema}.${table}` : table}
      (${columns.join(', ')})
      VALUES ${values.map((_: unknown[], i: number) => `(${columns.map((_: string, j: number) => `$${i * columns.length + j + 1}`).join(', ')})`).join(', ')}
      RETURNING *
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

export default router; 
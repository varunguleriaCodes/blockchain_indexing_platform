import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import router from '../lib/router';
import helius from '../lib/helius';
import { auth } from '../middleware/auth';
import { insertData } from '../services/postgres.service';
import { transactionsHandler } from '../services/transaction.handler';
const fs = require("fs");


router.post('/create-webhook', async (req: Request, res: Response):Promise<void> => {
  try {
      const { accountAddresses, transactionTypes, userId } = req.body;

      if (!accountAddresses || !transactionTypes || !userId) {
          res.status(400).json({ error: 'Missing required parameters' });
          return;
      }

      const apiKey = process.env.HELIUS_API_KEY;
      if (!apiKey) {
           res.status(500).json({ error: 'Helius API key is not configured' });
           return;
      }

      const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
      const webhookURL = `${backendUrl}/api/helius/webhook-handler?userId=${userId}`;
      const apiEndpoint = `https://api.helius.xyz/v0/webhooks?api-key=${apiKey}`;

      const payload = {
          webhookURL,
          transactionTypes,
          accountAddresses,
          webhookType: "enhanced",
          txnStatus: "all",
      };

      const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });

      const webhookCreationData = await response.json();

      console.log('Helius Webhook Created:', webhookCreationData);

      await prisma.webhook.create({
          data: {
              webhookId: webhookCreationData.webhookID,
              walletAddress: accountAddresses,
              transactionTypes: transactionTypes,
              userId
          }
      });

      res.status(201).json(webhookCreationData);
  } catch (error) {
      console.error('Unexpected Error:', error);
      res.status(500).json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.delete('/webhook/:webhookId', auth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { webhookId } = req.params;

        // Find the webhook in our database
        const webhook = await prisma.webhook.findFirst({
            where: {
                webhookId: webhookId,
            }
        });

        if (!webhook) {
            res.status(404).json({ error: 'Webhook not found' });
            return;
        }

        // Delete webhook from Helius
        await helius.deleteWebhook(webhookId);

        // Delete webhook from our database
        await prisma.webhook.delete({
            where: {
                id: webhook.id
            }
        });

        res.status(200).json({ message: 'Webhook deleted successfully' });
    } catch (error) {
        console.error('Error deleting webhook:', error);
        res.status(500).json({ error: 'Failed to delete webhook' });
    }
});

router.post("/webhook-handler", async (req: Request, res: Response): Promise<void> => {
    try {
        console.log("Received webhook data:", req.body);
        const data = JSON.stringify(req.body, null, 2);
        fs.appendFileSync("webhook_logs.json", data + ",\n");

        const transactionData = req.body;
        const userId = req.query.userId;

        // Find the webhook and get associated user
        const user = await prisma.user.findUnique({
            where: { id: Number(userId) },
            include: {
                postgresConnections: true
            }
        });
        if (!user || !user.postgresConnections.length) {
            console.error('No database connection found');
            res.status(404).json({ error: 'Webhook or database connection not found' });
            return;
        }

        const connectionPostgresData = user.postgresConnections[0]; // Using first connection

        // Process different types of data
        const dataFormation = transactionsHandler(transactionData[0].type.toLowerCase(), transactionData[0]);
        if(!dataFormation) {
            res.status(200).send("Event Not Supported");
            return;
        }
        if (dataFormation) {
            await insertData({
                connectionId: connectionPostgresData.id,
                userId: Number(userId),
                table: dataFormation.table,
                data: [dataFormation.data]
            });
        }

        res.status(200).send("Webhook received and processed successfully");
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Failed to process webhook data' });
    }
});

// Get user's webhooks
router.get('/webhooks', auth, async (req: any, res: Response): Promise<void> => {
    try {
        const webhooks = await prisma.webhook.findMany({
            where: {
                userId: req.query.userId
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(webhooks);
    } catch (error) {
        console.error('Error fetching webhooks:', error);
        res.status(500).json({ error: 'Failed to fetch webhooks' });
    }
});

export default router;
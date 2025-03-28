import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import router from '../lib/router';
import helius from '../lib/helius';
const fs = require("fs");

router.post('/create-webook', async (req: Request, res: Response): Promise<void> => {
    try {

    const { walletAddresses, transactionTypes, id} = req.body;
    const webhookCreationData = helius.createWebhook({
        accountAddresses: [walletAddresses],
        transactionTypes: [transactionTypes],
        webhookURL: 'https://a057-2405-201-5003-f857-949d-f81f-f6c0-8ee.ngrok-free.app/api/helius/webhook-handler',
    })
    
    } catch (error) {
    
    }
  });

  router.post("/webhook-handler", (req, res) => {
    console.log("Received webhook data:", req.body);
    const data = JSON.stringify(req.body, null, 2);
    fs.appendFileSync("webhook_logs.json", data + ",\n");
    // Process the received blockchain data
    res.status(200).send("Webhook received successfully");
});

export default router;
export function transactionsHandler(transactionType: string, data: any) {
    const sharedInfo = {
        eventIdentifier: data.signature,
        chain: "solana",
        networkCost: data.fee / 1_000_000_000,
        isSuccess: !data.transactionError,
        originPlatform: data.source || "unknown",
      };
    switch (transactionType) {
    case "transfer": {
        // Extract fee in SOL (converting from lamports)
        const feeInSol = data.fee / 1000000000;
        const descriptionMatch = data.description.match(
          /^(\S+)\s+transferred\s+([\d.]+)\s+(\S+)\s+user\s+account\s+->\s+(\S+).$/
        );
      
        let fromWallet = null,
          amount = null,
          token = null,
          toWallet = null;
      
        if (descriptionMatch) {
          [, fromWallet, amount, token, toWallet] = descriptionMatch;
        }
      
        return {
          table: "tranfer_data",
          data: {
            ...sharedInfo,
            txnHash: data.signature,
            eventTime: new Date(data.timestamp * 1000),
            sourcePlatform: data.source || "Jupiter",
            
            fromWallet,
            toWallet,
      
            swapAmount: amount ? parseFloat(amount) : null,
            swapToken: token,
      
            feeDetails: {
              solFee: feeInSol,
              networkFee: data.fee,
              feePayer: data.feePayer
            },
      
            swapDetails: {
              swapType: "exact_in", // Assuming this is an exact input swap
              slippage: null, // Needs extraction
              priceImpact: null // Needs calculation
            },
      
            status: data.transactionError ? "failed" : "success"
          }
        };
      }
    case "nft_bids": {
    const feeDeduction = data.fee / 1_000_000_000;
    const adjustedBidValue = data.amount - feeDeduction;
    
    return {
        table: "nft_bids_data",
        data: {
        ...sharedInfo,
        txnHash: data.signature,
        eventTime: new Date(data.timestamp * 1000),
        marketplaceName: data.source || "unknown",
    
        assetAddress: data.nftAddress,
        assetTokenId: data.tokenId,
    
        bidDetails: {
            total: data.amount,
            afterFees: adjustedBidValue,
            denom: data.currency || "SOL",
        },
    
        currentStatus: data.instructions.some(
            (instruction: any) => instruction.parsed?.type === "cancelBid"
        )
            ? "revoked"
            : "open",
    
        bidCategory: data.bidType || "standard",
        auctionContract: data.auctionHouseAddress || null,
    
        liquidityMetrics: {
            highestActiveBid: data.currentHighestBid || 0,
            totalBidsPlaced: data.totalBids || 1,
        },
        },
    };
    }
    
    case "nft_pricing": {
    
    const deductedFee = data.fee / 1_000_000_000;
    const finalSaleValue = data.amount - deductedFee;
    
    return {
        table: "nft_pricing_data",
        data: {
        ...sharedInfo,
        txnHash: data.signature,
        eventTime: new Date(data.timestamp * 1000),
        marketplaceName: data.source || "unknown",
    
        assetAddress: data.nftAddress,
        assetTokenId: data.tokenId,
    
        transactionValue: {
            grossAmount: data.amount,
            netAmount: finalSaleValue,
            currencyType: data.currency || "SOL",
        },
    
        transactionMode: data.instructions.some(
            (instruction: any) => instruction.program === "mpl_auction_house"
        )
            ? "auction"
            : "direct-sale",
    
        transactionFees: {
            platformCharge: deductedFee,
            royaltyCharge: data.royaltyFee || 0,
        },
    
        valuationHistory: {
            previousSale: data.amount,
            rollingAvg7d: null,
        },
        },
    };
    }
    default:
        return null;
    }
}
export function transactionsHandler(transactionType: string, data: any) {
  const sharedInfo = {
      eventIdentifier: data.signature,
      chain: "solana",
      networkCost: data.fee / 1_000_000_000,
      isSuccess: !data.transactionError,
      originPlatform: data.source || "unknown",
  };
  
  console.log("9", transactionType, sharedInfo);
  
  switch (transactionType) {
      case "transfer": {
          const feeInSol = data.fee / 1_000_000_000;
          let fromWallet = null, amount = null, token = null, toWallet = null;
          
          if (data.description) {
              const cleanedDescription = data.description.replace('.', '');
              const descriptionParts = cleanedDescription.split(' ');
              
              if (descriptionParts.length >= 5) {
                  [fromWallet, , amount, token, , toWallet] = descriptionParts;
              }
          }
  
          return {
              table: "transfer_data",
              data:{
              eventTime: new Date(data.timestamp * 1000),
              txnHash: data.signature,
              sourcePlatform: data.source || "Jupiter",
              fromWallet,
              toWallet,
              swapAmount: amount ? parseFloat(amount) : null,
              swapToken: token,
              solFee: feeInSol,
              networkFee: data.fee,
              feePayer: data.feePayer,
              swapType: "exact_in",
              slippage: null,
              priceImpact: null,
              status: data.transactionError ? "failed" : "success",
              ...sharedInfo
          }
        };
      }
  
      case "nft_bids": {
          const feeDeduction = data.fee / 1_000_000_000;
          const adjustedBidValue = data.amount - feeDeduction;
  
          return {
              table: "nft_bids_data",
              data:{
              eventTime: new Date(data.timestamp * 1000),
              txnHash: data.signature,
              marketplaceName: data.source || "unknown",
              assetAddress: data.nftAddress,
              assetTokenId: data.tokenId,
              totalBidAmount: data.amount,
              adjustedBidValue,
              currency: data.currency || "SOL",
              currentStatus: data.instructions.some((instruction: any) => instruction.parsed?.type === "cancelBid") ? "revoked" : "open",
              bidCategory: data.bidType || "standard",
              auctionContract: data.auctionHouseAddress || null,
              highestActiveBid: data.currentHighestBid || 0,
              totalBidsPlaced: data.totalBids || 1,
              ...sharedInfo
          },
        };
      }
  
      case "nft_pricing": {
          const deductedFee = data.fee / 1_000_000_000;
          const finalSaleValue = data.amount - deductedFee;
  
          return {
              table: "nft_pricing_data",data:{
              eventTime: new Date(data.timestamp * 1000),
              txnHash: data.signature,
              marketplaceName: data.source || "unknown",
              assetAddress: data.nftAddress,
              assetTokenId: data.tokenId,
              grossAmount: data.amount,
              netAmount: finalSaleValue,
              currencyType: data.currency || "SOL",
              transactionMode: data.instructions.some((instruction: any) => instruction.program === "mpl_auction_house") ? "auction" : "direct-sale",
              platformCharge: deductedFee,
              royaltyCharge: data.royaltyFee || 0,
              previousSale: data.amount,
              rollingAvg7d: null,
              ...sharedInfo
          },
        }
      }
  
      default:
          return null;
  }
}

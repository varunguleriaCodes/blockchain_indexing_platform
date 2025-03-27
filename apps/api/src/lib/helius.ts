import { Helius } from "helius-sdk";
  
const helius = new Helius( process.env.HELIUS_API_KEY || 'helius-api-key',);
  
export default helius;
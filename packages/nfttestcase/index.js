import {
  createProgrammableNft,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  createGenericFile,
  createSignerFromKeypair,
  generateSigner,
  percentAmount,
  publicKey,
  signerIdentity,
  sol,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { base58 } from "@metaplex-foundation/umi/serializers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { Keypair } from "@solana/web3.js";
import { fromWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const createNft = async () => {
  try {
    const umi = createUmi("https://api.devnet.solana.com")
      .use(mplTokenMetadata())
      .use(irysUploader({ address: "https://devnet.irys.xyz" }));

    const keypairPath = path.join(__dirname, "keypair.json");
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
    const web3Keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
    const umiKeypair = createSignerFromKeypair(
      umi,
      fromWeb3JsKeypair(web3Keypair)
    );
    umi.use(signerIdentity(umiKeypair));

    console.log("Reading image file...");
    const imageData = fs.readFileSync(path.join(__dirname, "image.jpg"));
    const nftImage = createGenericFile(imageData, "nft-image.png", {
      tags: [{ name: "Content-Type", value: "image/png" }],
    });

    console.log("Uploading NFT image...");
    const imageUri = await umi.uploader.upload([nftImage]);
    
    const metadata = {
      name: "Unique Solana NFT",
      description: "A beautifully crafted NFT on Solana blockchain.",
      image: imageUri[0],
      external_url: "https://example.com",
      attributes: [
        { trait_type: "Category", value: "Digital Art" },
        { trait_type: "Rarity", value: "Legendary" },
      ],
      properties: {
        files: [{ uri: imageUri[0], type: "image/png" }],
        category: "image",
      },
    };

    console.log("Uploading NFT metadata...");
    const metadataUri = await umi.uploader.uploadJson(metadata);
    
    const nftSigner = generateSigner(umi);
    const ruleSet = publicKey("eBJLFYPxJmMGKuFwpDWkzxZeUrad92kZRC5BJLpzyT9");

    console.log("Minting Programmable NFT...");
    const transaction = await createProgrammableNft(umi, {
      mint: nftSigner,
      sellerFeeBasisPoints: percentAmount(6.0),
      name: metadata.name,
      uri: metadataUri,
      ruleSet: ruleSet,
    }).sendAndConfirm(umi);

    const txnSignature = base58.deserialize(transaction.signature)[0];
    console.log("\n✅ NFT Successfully Created!");
    console.log("🔗 View Transaction: ");
    console.log(`https://explorer.solana.com/tx/${txnSignature}?cluster=devnet`);
    console.log("\n🌟 View Your NFT:");
    console.log(
      `https://explorer.solana.com/address/${nftSigner.publicKey}?cluster=devnet`
    );
  } catch (error) {
    console.error("❌ Error creating NFT:", error.message);
  }
};

createNft();

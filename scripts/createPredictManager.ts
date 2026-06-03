/**
 * One-off: create a PredictManager on Sui Testnet for the signing wallet.
 *
 * Run once, copy the printed manager id into NEXT_PUBLIC_PREDICT_MANAGER.
 * Keys are NEVER hard-coded — the signer is loaded from the Sui CLI keystore
 * (~/.sui/sui_config/sui.keystore) or from SUI_ADMIN_PRIVATE_KEY in the env.
 *
 *   pnpm dlx tsx --env-file=.env.local scripts/createPredictManager.ts
 *
 * Requires NEXT_PUBLIC_PREDICT_PACKAGE in the env (or in .env.local loaded via
 * the --env-file flag above). The `predict::create_manager` entry shares the
 * manager and emits PredictManagerCreated.
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import type { SuiObjectChange } from "@mysten/sui/jsonRpc";

function loadKeypair(): Ed25519Keypair {
  const fromEnv = process.env.SUI_ADMIN_PRIVATE_KEY;
  if (fromEnv && fromEnv.length > 0) {
    const { scheme, secretKey } = decodeSuiPrivateKey(fromEnv);
    if (scheme !== "ED25519") {
      throw new Error(`SUI_ADMIN_PRIVATE_KEY must be ed25519, got ${scheme}`);
    }
    return Ed25519Keypair.fromSecretKey(secretKey);
  }

  const keystorePath = join(homedir(), ".sui", "sui_config", "sui.keystore");
  const raw = readFileSync(keystorePath, "utf8");
  const entries = JSON.parse(raw) as unknown;
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error(`No keys found in ${keystorePath}`);
  }
  const first = entries[0];
  if (typeof first !== "string") {
    throw new Error(`Unexpected keystore entry shape in ${keystorePath}`);
  }
  const bytes = Buffer.from(first, "base64");
  if (bytes.length !== 33 || bytes[0] !== 0) {
    throw new Error(
      `First keystore entry is not ed25519 (scheme byte=${bytes[0]}, len=${bytes.length}). ` +
        `Provide SUI_ADMIN_PRIVATE_KEY (suiprivkey...) instead.`,
    );
  }
  return Ed25519Keypair.fromSecretKey(bytes.slice(1));
}

async function main(): Promise<void> {
  const packageId = process.env.NEXT_PUBLIC_PREDICT_PACKAGE;
  if (!packageId || packageId.length === 0) {
    throw new Error(
      "NEXT_PUBLIC_PREDICT_PACKAGE is not set. Add it to .env.local first.",
    );
  }

  const client = new SuiJsonRpcClient({
    url: getJsonRpcFullnodeUrl("testnet"),
    network: "testnet",
  });

  const signer = loadKeypair();
  const sender = signer.toSuiAddress();
  console.log(`[predict] signer: ${sender}`);
  console.log(`[predict] package: ${packageId}`);

  const tx = new Transaction();
  tx.moveCall({
    target: `${packageId}::predict::create_manager`,
    arguments: [],
  });
  tx.setSender(sender);

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer,
    options: { showEffects: true, showObjectChanges: true, showEvents: true },
  });

  const digest = result.digest;
  console.log(`[predict] digest: ${digest}`);
  console.log(`[predict] explorer: https://suiscan.xyz/testnet/tx/${digest}`);

  const changes: SuiObjectChange[] = result.objectChanges ?? [];
  const created = changes.filter(
    (c): c is Extract<SuiObjectChange, { type: "created" }> => c.type === "created",
  );

  const managerChange = created.find((c) => /PredictManager/.test(c.objectType));

  if (managerChange) {
    console.log(`[predict] PredictManager id: ${managerChange.objectId}`);
    console.log(`[predict] type: ${managerChange.objectType}`);
    console.log(
      `[predict] -> paste this into NEXT_PUBLIC_PREDICT_MANAGER in .env.local`,
    );
  } else {
    console.warn(
      "[predict] could not locate created PredictManager in objectChanges. Created objects:",
    );
    for (const c of created) console.warn(`  - ${c.objectType} → ${c.objectId}`);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

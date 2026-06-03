/**
 * One-off: create a PaymentRegistry on Sui Testnet (Phase 4.8 STEP 2).
 *
 * Run once, copy the printed registry id into NEXT_PUBLIC_PAYKIT_REGISTRY.
 * Keys are NEVER hard-coded — the signer is loaded from the Sui CLI keystore
 * (~/.sui/sui_config/sui.keystore) or from SUI_ADMIN_PRIVATE_KEY in the env.
 *
 *   pnpm dlx tsx scripts/createPayKitRegistry.ts [registryName]
 *
 * Default registry name: "predictflow-demo".
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { paymentKit } from "@mysten/payment-kit";
import type { SuiObjectChange } from "@mysten/sui/jsonRpc";

const DEFAULT_REGISTRY_NAME = "predictflow-demo";

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
  // Sui keystore stores raw base64-encoded 33-byte (scheme || key) blobs.
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
  const registryName = process.argv[2]?.trim() || DEFAULT_REGISTRY_NAME;

  const client = new SuiJsonRpcClient({
    url: getJsonRpcFullnodeUrl("testnet"),
    network: "testnet",
  }).$extend(paymentKit());

  const signer = loadKeypair();
  const sender = signer.toSuiAddress();
  console.log(`[paykit] signer: ${sender}`);
  console.log(`[paykit] registry name: "${registryName}"`);

  // The on-chain `create_registry` returns a tuple
  //   (PaymentRegistry, RegistryAdminCap)
  // so the caller must `share` the registry and transfer the admin cap. The
  // SDK's `tx.createRegistry()` helper drops both, which the Move verifier
  // rejects (`UnusedValueWithoutDrop`). We bypass it with explicit moveCalls.
  const PAYKIT_PACKAGE =
    "0x7e069abe383e80d32f2aec17b3793da82aabc8c2edf84abbf68dd7b719e71497";
  const PAYKIT_NAMESPACE =
    "0xa5016862fdccba7cc576b56cc5a391eda6775200aaa03a6b3c97d512312878db";

  const tx = new Transaction();
  const [registry, adminCap] = tx.moveCall({
    target: `${PAYKIT_PACKAGE}::payment_kit::create_registry`,
    arguments: [tx.object(PAYKIT_NAMESPACE), tx.pure.string(registryName)],
  });
  tx.moveCall({
    target: `${PAYKIT_PACKAGE}::payment_kit::share`,
    arguments: [registry],
  });
  tx.transferObjects([adminCap], sender);
  tx.setSender(sender);

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer,
    options: { showEffects: true, showObjectChanges: true },
  });

  const digest = result.digest;
  console.log(`[paykit] digest: ${digest}`);
  console.log(`[paykit] explorer: https://suiscan.xyz/testnet/tx/${digest}`);

  const changes: SuiObjectChange[] = result.objectChanges ?? [];
  const created = changes.filter(
    (c): c is Extract<SuiObjectChange, { type: "created" }> => c.type === "created",
  );

  const registryChange = created.find((c) => /PaymentRegistry/.test(c.objectType));
  const adminCapChange = created.find((c) => /RegistryAdminCap/.test(c.objectType));

  if (registryChange) {
    console.log(`[paykit] PaymentRegistry id: ${registryChange.objectId}`);
    console.log(
      `[paykit] -> paste this into NEXT_PUBLIC_PAYKIT_REGISTRY in .env.local`,
    );
  } else {
    console.warn("[paykit] could not locate created PaymentRegistry in objectChanges");
  }

  if (adminCapChange) {
    console.log(`[paykit] RegistryAdminCap id: ${adminCapChange.objectId}`);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

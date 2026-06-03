export type WalletNetwork = "sui:testnet" | "sui:mainnet" | "unknown";

export type WalletState = {
  connected: boolean;
  address?: string;
  walletName?: string;
  network?: WalletNetwork;
};

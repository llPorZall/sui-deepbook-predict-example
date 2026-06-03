export function shortenAddress(
  addr: string,
  head = 6,
  tail = 4,
): string {
  if (typeof addr !== "string") return "";
  if (addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function suiscanUrl(
  id: string,
  network: "testnet" | "mainnet" | "devnet" = "testnet",
): string {
  const looksLikeHex = /^0x[0-9a-fA-F]+$/.test(id);
  const kind = looksLikeHex ? "object" : "tx";
  return `https://suiscan.xyz/${network}/${kind}/${id}`;
}

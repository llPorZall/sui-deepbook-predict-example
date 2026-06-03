"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { shortenAddress, suiscanUrl } from "@/lib/utils/format";
import { toast } from "@/lib/toast/toastStore";

type Props = {
  value: string;
  head?: number;
  tail?: number;
  className?: string;
  showLink?: boolean;
  network?: "testnet" | "mainnet" | "devnet";
  ariaLabel?: string;
};

export function CopyableId({
  value,
  head = 6,
  tail = 4,
  className,
  showLink = true,
  network = "testnet",
  ariaLabel,
}: Props) {
  const [copied, setCopied] = useState(false);

  const onCopy = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard?.writeText(value);
      setCopied(true);
      toast.success("Copied", value);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Couldn't copy", value);
    }
  };

  const onLinkClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
  };

  const short = shortenAddress(value, head, tail);
  const label = ariaLabel ?? "Copy ID";

  return (
    <span className={`copy-id${className ? ` ${className}` : ""}`}>
      <button
        type="button"
        className="copy-id-btn"
        onClick={onCopy}
        title={`Click to copy\n${value}`}
        aria-label={label}
      >
        <span className="copy-id-text">{short}</span>
        <span className="copy-id-icon" aria-hidden>
          {copied ? <Check /> : <Copy />}
        </span>
      </button>
      {showLink && (
        <a
          className="copy-id-link"
          href={suiscanUrl(value, network)}
          target="_blank"
          rel="noopener noreferrer"
          title={`View on Suiscan ${network}`}
          aria-label={`View ${short} on Suiscan ${network}`}
          onClick={onLinkClick}
        >
          <ExternalLink aria-hidden />
        </a>
      )}
    </span>
  );
}

export default CopyableId;

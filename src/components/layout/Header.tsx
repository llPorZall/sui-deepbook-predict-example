import { Sparkles } from "lucide-react";

export function Header() {
  return (
    <header className="nav">
      <div className="nav-inner">
        <a href="/" className="brand" aria-label="PredictFlow home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <g
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
              >
                <path d="M15 24 C 24 24, 26 15, 34 15" />
                <path d="M15 24 C 24 24, 26 33, 34 33" />
              </g>
              <circle cx="15" cy="24" r="4" fill="currentColor" />
              <circle cx="34" cy="15" r="3.4" fill="currentColor" />
              <circle cx="34" cy="33" r="3.4" fill="currentColor" />
            </svg>
          </span>
          <span className="brand-name">PredictFlow</span>
        </a>

        <div className="nav-right">
          <span className="demo-badge" title="Demo mode — no live funds">
            <Sparkles aria-hidden="true" />
            Demo Mode
          </span>
          <span className="wallet-chip" aria-label="Wallet disconnected">
            <span className="wallet-dot is-off" aria-hidden="true" />
            <span className="wallet-addr">Not connected</span>
            <span className="wallet-net">Testnet</span>
          </span>
        </div>
      </div>
    </header>
  );
}

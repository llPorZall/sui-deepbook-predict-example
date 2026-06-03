import { AlertTriangle } from "lucide-react";

export function Footer() {
  return (
    <footer>
      <div className="footer-inner">
        <AlertTriangle aria-hidden="true" />
        <span>
          Demo only — Sui Overflow 2026. Not financial advice. No live funds.
        </span>
      </div>
    </footer>
  );
}

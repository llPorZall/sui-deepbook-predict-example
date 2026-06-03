import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "./predictflow.css";
import { Providers } from "@/lib/sui/providers";

const inter = Inter({
  variable: "--sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PredictFlow",
  description:
    "A bounded-AI prediction market on Sui Testnet — powered by Sui Payment, DeepBook Predict, and an AI research agent.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} min-h-full flex flex-col`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

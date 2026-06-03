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
    "Sui Payment + DeepBook Predict + bounded AI agent — a Sui Overflow 2026 demo.",
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

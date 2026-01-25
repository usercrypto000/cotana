import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cotana",
  description: "Personal DeFi research system for onchain investigations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

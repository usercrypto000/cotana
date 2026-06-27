import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { brandCssVariables } from "@cotana/config";
import { StorePrivyProvider } from "../components/store-privy-provider";
import "./globals.css";

const fontVariables = {
  "--font-ubuntu": "'Ubuntu'",
  "--font-open-sans": "'Open Sans'",
  "--font-inter": "'Inter'"
};

export const metadata: Metadata = {
  title: "Cotana Store",
  description: "Consumer-first discovery for crypto applications."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      style={{ ...brandCssVariables, ...fontVariables } as CSSProperties}
    >
      <body className="font-body antialiased">
        <StorePrivyProvider>{children}</StorePrivyProvider>
      </body>
    </html>
  );
}

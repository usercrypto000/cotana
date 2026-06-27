import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { brandCssVariables } from "@cotana/config";
import { AdminPrivyProvider } from "../components/admin-privy-provider";
import "./globals.css";

const fontVariables = {
  "--font-ubuntu": "'Ubuntu'",
  "--font-open-sans": "'Open Sans'",
  "--font-inter": "'Inter'"
};

export const metadata: Metadata = {
  title: "Cotana Admin",
  description: "Internal operations for the Cotana catalog."
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
        <AdminPrivyProvider>{children}</AdminPrivyProvider>
      </body>
    </html>
  );
}

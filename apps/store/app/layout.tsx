import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { StorePrivyProvider } from "../components/store-privy-provider";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans"
});

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
    <html lang="en" className={plusJakartaSans.variable}>
      <body className="font-sans antialiased">
        <StorePrivyProvider>{children}</StorePrivyProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter, Open_Sans, Ubuntu } from "next/font/google";
import { AdminPrivyProvider } from "../components/admin-privy-provider";
import "./globals.css";

const ubuntu = Ubuntu({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-ubuntu"
});

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans"
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
});

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
    <html lang="en" className={`${ubuntu.variable} ${openSans.variable} ${inter.variable}`}>
      <body className="font-body antialiased">
        <AdminPrivyProvider>{children}</AdminPrivyProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { AdminPrivyProvider } from "../components/admin-privy-provider";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans"
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
    <html lang="en" className={ibmPlexSans.variable}>
      <body className="font-sans antialiased">
        <AdminPrivyProvider>{children}</AdminPrivyProvider>
      </body>
    </html>
  );
}

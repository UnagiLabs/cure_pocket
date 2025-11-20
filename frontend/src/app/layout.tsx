import type { Metadata } from "next";
import "./globals.css";
import { SuiProviders } from "@/components/providers/SuiProviders";
import { AppProvider } from "@/contexts/AppContext";
import "@mysten/dapp-kit/dist/index.css";

export const metadata: Metadata = {
  title: "CurePocket - Your Global Medication Passport",
  description:
    "Privacy-preserving medication management powered by Sui and Walrus",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SuiProviders>
          <AppProvider>{children}</AppProvider>
        </SuiProviders>
      </body>
    </html>
  );
}

import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { StoreProvider } from "@/lib/store";

import "./globals.css";

export const metadata: Metadata = {
  title: "TurfOps — Robotic Mowing Underwriting",
  description:
    "Site evaluation, equipment matching and underwriting for leave-behind autonomous mowing on commercial property.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}

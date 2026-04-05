import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { NotificationCenter } from "@/components/shared/notification-center";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "AI Governance Control Tower",
    template: "%s | AI Governance Control Tower",
  },
  description:
    "Enterprise AI Governance platform for DPDP, ISO 42001, and Responsible AI compliance",
  robots: "noindex, nofollow", // Enterprise internal tool
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <Toaster />
        <NotificationCenter />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SideNav } from "@/components/shell/side-nav";
import { TopNav } from "@/components/shell/top-nav";
import { ReactQueryProvider } from "@/components/providers/react-query-provider";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StockSense",
  description: "Portfolio tracking and analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}>
        <ReactQueryProvider>
          <div className="grid grid-cols-[240px_1fr] grid-rows-[56px_1fr] min-h-screen">
            <div className="row-span-2 border-r">
              <SideNav />
            </div>
            <div className="col-start-2 border-b">
              <TopNav />
            </div>
            <main className="col-start-2 p-6">{children}</main>
          </div>
          <Toaster />
        </ReactQueryProvider>
      </body>
    </html>
  );
}

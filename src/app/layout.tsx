import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SideNav } from "@/components/shell/side-nav";
import { TopNav } from "@/components/shell/top-nav";
import { ReactQueryProvider } from "@/components/providers/react-query-provider";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "StockSense - Professional Portfolio Analytics",
  description: "Advanced portfolio tracking and analytics platform for professional investors",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" }
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full overflow-hidden`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'StockSense',
              url: 'https://stocksense.app',
              applicationCategory: 'FinanceApplication',
              description: 'Advanced portfolio tracking and analytics platform for professional investors',
              operatingSystem: 'Web',
            })
          }}
        />
        <ReactQueryProvider>
          <div className="h-screen bg-neutral-50 dark:bg-neutral-950 flex">
            {/* Sidebar */}
            <div className="w-64 flex-shrink-0 hidden lg:block">
              <SideNav />
            </div>
            
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Top Navigation */}
              <TopNav />
              
              {/* Page Content */}
              <main className="flex-1 overflow-auto bg-neutral-50 dark:bg-neutral-950">
                <div className="p-6 h-full">
                  {children}
                </div>
              </main>
            </div>
          </div>
          <Toaster />
        </ReactQueryProvider>
      </body>
    </html>
  );
}

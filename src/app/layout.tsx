import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CRM Absenku",
  description: "Asisten AI untuk Manajemen Leads dan Follow Up Absenku",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CRM Absenku"
  }
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

import SideNav from "./components/SideNav";
import { LeadsProvider } from "./context/LeadsContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="flex h-screen overflow-hidden bg-gray-100 dark:bg-slate-950 text-gray-900 dark:text-slate-100">
        <LeadsProvider>
            <SideNav />
            <div className="flex-1 flex flex-col relative overflow-hidden pb-16 md:pb-0 w-full">
                {children}
            </div>
        </LeadsProvider>
      </body>
    </html>
  );
}

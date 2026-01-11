import type { Metadata } from "next";

import "./globals.css";
import { cn } from "@/lib/utils";
import AppShell from "@/components/app-shell";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";

import { FirebaseClientProvider } from "@/firebase";
import { PrivacyProvider } from "@/context/privacy-context";
import { getGlobalBanner } from "@/app/actions/adminActions";

export const metadata: Metadata = {
  title: "OptiManager Pro",
  description: "Advanced Optician Management System",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const banner = await getGlobalBanner();

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Alegreya:wght@400;700&family=PT+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={cn("font-body antialiased", "min-h-screen w-full")}
        suppressHydrationWarning
      >
        <FirebaseClientProvider>
          <PrivacyProvider>
            <AppShell banner={banner}>
              {children}
            </AppShell>
          </PrivacyProvider>
        </FirebaseClientProvider>
        <Toaster />
        <SonnerToaster />
      </body>
    </html>
  );
}

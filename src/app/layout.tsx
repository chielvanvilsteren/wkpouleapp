import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Press_Start_2P } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"] });
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});
const pressStart2P = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-press-start",
});

export const metadata: Metadata = {
  title: "WK Pool 2026",
  description: "Voorspel WK 2026 wedstrijden, selectie en incidenten",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'WK Poule',
  },
  formatDetection: { telephone: false },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isDisplay = pathname.startsWith("/display");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  if (user && !isDisplay) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = data as Profile | null;
  }

  return (
    <html lang="nl">
      <head>
        <meta name="theme-color" content="#003082" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icon-192" />
      </head>
      <body className={`${inter.className} ${jetbrains.variable} ${pressStart2P.variable}`}>
        <ServiceWorkerRegistrar />
        {!isDisplay && <Navbar user={user} profile={profile} />}
        <main className={isDisplay ? "" : "min-h-screen"}>{children}</main>
        {!isDisplay && (
          <footer className="bg-knvb-500 text-white/60 text-center text-xs py-4 mt-16">
            WK Pool 2026 &middot; Veel succes! 🇳🇱
          </footer>
        )}
      </body>
    </html>
  );
}

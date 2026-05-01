import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"] });
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "WK Pool 2026",
  description: "Voorspel WK 2026 wedstrijden, selectie en incidenten",
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
      <body className={`${inter.className} ${jetbrains.variable}`}>
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

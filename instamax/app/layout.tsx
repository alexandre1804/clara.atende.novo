import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "InstaMax — Análise e Crescimento no Instagram",
  description: "Consultoria profissional com IA para crescer no Instagram. Análise completa do perfil, cronograma de conteúdo detalhado e geração de imagens.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={outfit.variable}>
      <body className={`${outfit.className} antialiased`}>{children}</body>
    </html>
  );
}

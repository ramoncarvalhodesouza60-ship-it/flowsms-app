import type { Metadata } from "next";
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
  title: "FlowSMS — Sistema SMSPro",
  description: "FlowSMS — Plataforma de SMS para empresas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="facebook-domain-verification" content="ujieyjobwejxpd6aihkrdk743hz6pd" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <footer style={{ textAlign: 'center', padding: '12px', fontSize: '11px', color: '#999' }}>
          © 2026 FlowSMS | CNPJ 67.495.542/0001-53 | 67.495.542 RAMON DE CARVALHO SOUZA
        </footer>
      </body>
    </html>
  );
}

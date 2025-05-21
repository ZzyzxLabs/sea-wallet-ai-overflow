import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./provider"; // 引入剛建立的客戶端 Provider

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "SeaWallet.ai",
  description: "Your secure and intelligent crypto wallet.",
  keywords: ["crypto", "wallet", "blockchain", "SeaWallet", "AI", "web3"],
  authors: [{ name: "Zzyzx Labs", url: "https://seawallet.ai" }],
  themeColor: "#4da2ff",
  openGraph: {
    title: "SeaWallet.ai",
    description: "Your secure and intelligent crypto wallet.",
    url: "https://seawallet.ai",
    siteName: "SeaWallet.ai",
    images: [
      {
        url: "/icon.png",
        width: 1200,
        height: 630,
        alt: "SeaWallet.ai Open Graph Image",
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang='en'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

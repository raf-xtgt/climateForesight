import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Provider } from "@/components/ui/provider"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Climate Foresight - Interactive Climate Visualization",
  description: "Explore climate data through interactive 3D globe visualization",
};

export default function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props
  return (
    <html suppressHydrationWarning lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ 
          margin: 0, 
          padding: 0,
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #3182ce 0%, #2c5aa0 25%, #1e3a8a 50%, #7c3aed 100%)',
          backgroundAttachment: 'fixed'
        }}
      >
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HELIX | Bio-Digital Learning",
  description: "Advanced bio-digital academic management platform",
};

import { Suspense } from "react";
import DNABackground from "@/components/DNABackground";
import NavigationProgressBar from "@/components/NavigationProgressBar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Suspense fallback={null}>
          <NavigationProgressBar />
        </Suspense>
        <DNABackground />
        <div className="bio-particle" style={{ width: '400px', height: '400px', background: 'var(--accent-primary)', top: '10%', left: '5%', animationDelay: '0s' }}></div>
        <div className="bio-particle" style={{ width: '300px', height: '300px', background: 'var(--dna-blue)', top: '60%', left: '80%', animationDelay: '-5s' }}></div>
        <div className="bio-particle" style={{ width: '250px', height: '250px', background: 'var(--dna-purple)', top: '40%', left: '40%', animationDelay: '-10s' }}></div>
        {children}
      </body>
    </html>
  );
}

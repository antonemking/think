import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Think Canvas",
  description: "A Heptabase-like spatial knowledge canvas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

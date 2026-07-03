import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tiles & Sanitary Showroom - Inventory & Sales System",
  description: "Advanced inventory control, sales management, and analytics platform for Tiles & Sanitary showrooms.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}


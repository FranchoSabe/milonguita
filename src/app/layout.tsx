import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/navigation";

export const metadata: Metadata = {
  title: "POS - Punto de Venta",
  description: "Sistema de punto de venta para local de comida",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">
        <main className="min-h-screen pb-20">{children}</main>
        <Navigation />
      </body>
    </html>
  );
}

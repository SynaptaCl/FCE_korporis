import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FCE — Korporis Centro de Salud",
    template: "%s | FCE Korporis",
  },
  description:
    "Ficha Clínica Electrónica de Korporis Centro de Salud — Kinesiología, Fonoaudiología y Masoterapia",
};

/*
 * TODO: En producción (Vercel), reemplazar por Google Fonts:
 *   import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
 * y agregar las variables --font-outfit / --font-plus-jakarta al <html>.
 * En este entorno de desarrollo las Google Fonts no están disponibles.
 */

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-CL" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

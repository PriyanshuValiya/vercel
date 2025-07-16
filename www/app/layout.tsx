import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700"],
});
 
export const metadata: Metadata = {
  title: "Vercel",
  description: "Deploy your websites with Vercel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.className} antialiased`}>
      <body>
        <AuthProvider>
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}

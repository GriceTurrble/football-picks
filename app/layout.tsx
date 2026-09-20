import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ModalStackProvider } from "@/app/modal-stack";
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
  title: "Football Picks",
  description: "Pick your NFL winners, week by week.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col overflow-hidden">
        <ModalStackProvider>{children}</ModalStackProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BloodBank Manager",
    template: "%s | BloodBank Manager",
  },
  description: "Modern blood bank management system — donors, donations, inventory, and requests.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

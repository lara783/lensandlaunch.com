import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lens & Launch — Client Portal",
  description: "Your dedicated project hub with Lens & Launch Media.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#010101",
                color: "#ffffff",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "999px",
                fontFamily: "var(--font-body)",
                fontSize: "0.875rem",
                padding: "0.75rem 1.25rem",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}

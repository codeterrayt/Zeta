import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SessionProvider } from "next-auth/react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "OpenJira",
  description: "A professional, high-performance Jira alternative.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-background text-foreground h-screen flex flex-col overflow-hidden`}>
        <SessionProvider>
          <ThemeProvider attribute="class" defaultTheme="theme-jira">
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}

import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SessionProvider } from "next-auth/react"
import { Toaster } from "sonner"

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
      <body className={`${inter.className} antialiased bg-background text-foreground min-h-screen flex flex-col`} suppressHydrationWarning>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="theme-jira"
          enableSystem={false}
          disableTransitionOnChange
          value={{
            'theme-jira': 'theme-jira',
            'theme-monaco': 'theme-monaco'
          }}
        >
          <SessionProvider>
            {children}
            <Toaster richColors position="top-right" />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider as NextThemesProvider } from "next-themes"
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
      <body className={`${inter.className} antialiased bg-background text-foreground min-h-screen flex flex-col`} suppressHydrationWarning>
        <NextThemesProvider 
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
          </SessionProvider>
        </NextThemesProvider>
      </body>
    </html>
  )
}

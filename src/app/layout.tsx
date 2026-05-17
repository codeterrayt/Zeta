import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SessionProvider } from "next-auth/react"
import { Toaster } from "sonner"

import { RealtimeProvider } from "@/components/providers/realtime-provider"

const inter = Inter({ subsets: ["latin"] })

import { auth } from "@/auth"

export const metadata: Metadata = {
  title: "Zeta",
  description: "A professional, high-performance Jira alternative.",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-background text-foreground min-h-screen flex flex-col`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="theme-zeta"
          enableSystem={false}
          disableTransitionOnChange
          value={{
            'theme-zeta': 'theme-zeta',
            'theme-monaco': 'theme-monaco'
          }}
        >
          <SessionProvider session={session}>
            <RealtimeProvider>
              {children}
              <Toaster richColors position="top-right" />
            </RealtimeProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

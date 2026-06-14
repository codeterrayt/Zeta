import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { CommandPalette } from "@/components/layout/command-palette"
import { FloatingChat } from "@/components/chat/floating-chat"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <Header />
        {/*
          Scrollable region: pages that need scrolling add their own
          overflow-y-auto inner wrapper. Pages like Chat that are fixed-height
          use h-full overflow-hidden and rely on min-h-0 here to stay bounded.
        */}
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] custom-scrollbar" id="dashboard-scroll-container">
          <main className="flex-1 flex flex-col">
            {children}
          </main>
          <Footer />
        </div>
      </div>
      <CommandPalette />
      <FloatingChat />
    </div>
  )
}

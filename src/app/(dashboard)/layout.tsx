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
      <div className="flex-1 flex flex-col min-w-0 relative">
        <Header />
        
        {/* Scrollable Container with Stable Gutter to prevent layout shifts */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col [scrollbar-gutter:stable] custom-scrollbar">
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

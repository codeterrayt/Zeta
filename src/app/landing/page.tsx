import type { Metadata } from "next"
import { LandingNavbar } from "./_components/navbar"
import { HeroSection } from "./_components/hero-section"
import { FeaturesSection } from "./_components/features-section"
import { InteractiveDemo } from "./_components/interactive-demo"
import { DocumentationSection } from "./_components/documentation-section"
import { SelfHostSection } from "./_components/self-host-section"
import { CtaSection, LandingFooter } from "./_components/footer"

export const metadata: Metadata = {
  title: "Zeta – Open Source Project Management",
  description:
    "A high-performance, self-hostable Jira alternative with real-time Kanban boards, sprint planning, rich documentation, and team collaboration. Free forever, MIT licensed.",
  openGraph: {
    title: "Zeta – Open Source Project Management",
    description: "Self-hostable Jira alternative. Kanban, sprints, docs, real-time collaboration. Free & MIT licensed.",
    type: "website",
  },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground theme-zeta">
      <LandingNavbar />
      <HeroSection />
      <FeaturesSection />
      <InteractiveDemo />
      <DocumentationSection />
      <SelfHostSection />
      <CtaSection />
      <LandingFooter />
    </div>
  )
}

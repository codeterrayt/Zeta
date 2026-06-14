/**
 * Chat-specific layout that overrides the dashboard scrollable container.
 * Provides a fixed-height, non-scrolling wrapper so the 3-column chat UI
 * fills the viewport exactly without pushing the editor off screen.
 */
export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {children}
    </div>
  )
}

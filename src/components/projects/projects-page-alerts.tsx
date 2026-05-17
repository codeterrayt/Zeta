"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { ShieldAlert, Trash2, X } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

export function ProjectsPageAlerts() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = React.useState(false)
  const [alertType, setAlertType] = React.useState<"removed" | "deleted" | null>(null)
  const [deletedProjName, setDeletedProjName] = React.useState("")

  React.useEffect(() => {
    const alert = searchParams?.get("modalAlert")
    if (alert === "removed") {
      setAlertType("removed")
      setOpen(true)
    } else if (alert === "deleted") {
      setAlertType("deleted")
      setDeletedProjName(searchParams?.get("projectName") || "the project")
      setOpen(true)
    } else {
      setOpen(false)
      setAlertType(null)
    }
  }, [searchParams?.get("modalAlert"), searchParams?.get("projectName")])

  const handleClose = () => {
    setOpen(false)
    // Clear search parameters from URL cleanly without full reload
    router.push("/projects")
  }

  if (!alertType) return null

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(val) => { if (!val) handleClose() }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-6 border border-border/60 bg-card p-8 shadow-2xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 sm:rounded-[2.5rem] overflow-hidden">
          
          <div className="flex flex-col items-center text-center space-y-4">
            {alertType === "removed" ? (
              <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-[1.8rem] flex items-center justify-center shadow-lg shadow-destructive/5 animate-bounce">
                <ShieldAlert className="w-10 h-10" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-[1.8rem] flex items-center justify-center shadow-lg shadow-destructive/5 animate-pulse">
                <Trash2 className="w-10 h-10" />
              </div>
            )}

            <div className="space-y-2">
              <DialogPrimitive.Title className="text-3xl font-black tracking-tight text-foreground">
                {alertType === "removed" ? "Access Revoked" : "Project Deleted"}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm font-medium text-muted-foreground/80 leading-relaxed px-2">
                {alertType === "removed" ? (
                  "You got removed from the project workspace by an administrator."
                ) : (
                  <>
                    The project <span className="font-bold text-destructive">"{deletedProjName}"</span> was deleted by the administrator.
                  </>
                )}
              </DialogPrimitive.Description>
            </div>
          </div>

          <div className="flex justify-center pt-4 border-t border-border/40 mt-4">
            <button
              onClick={handleClose}
              className="w-full bg-primary text-primary-foreground py-3.5 rounded-2xl text-sm font-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-98"
            >
              Got it
            </button>
          </div>

        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

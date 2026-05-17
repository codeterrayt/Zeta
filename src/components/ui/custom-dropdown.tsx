"use client"

import * as React from "react"
import { ChevronDown, LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface Option {
  value: string
  label: string
}

interface CustomDropdownProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  icon: LucideIcon
  label: string
  className?: string
  disabled?: boolean
}

export function CustomDropdown({ value, onChange, options, icon: Icon, label, className, disabled }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (disabled) {
      setIsOpen(false)
    }
  }, [disabled])

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedOption = options.find((o) => o.value === value)

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all group min-w-[150px] w-full disabled:opacity-50 disabled:cursor-not-allowed",
          isOpen ? "bg-card border-primary shadow-lg ring-2 ring-primary/10" : "bg-secondary/30 border-border/50 hover:border-primary/30"
        )}
      >
        <Icon className={cn("w-4 h-4 transition-colors shrink-0", isOpen ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
        <span className="text-sm font-bold flex-1 text-left truncate">
          {selectedOption?.label || label}
        </span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-300 shrink-0", isOpen && "rotate-180")} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute top-full mt-2 left-0 min-w-[200px] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold rounded-xl transition-all",
                  value === option.value 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                    : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {option.label}
                {value === option.value && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

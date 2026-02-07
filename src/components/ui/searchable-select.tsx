"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface SearchableSelectOption {
  label: string
  value: string
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  onCreateNew?: (name: string) => Promise<void>
  createNewLabel?: string
  isCreating?: boolean
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Sélectionner...",
  searchPlaceholder = "Rechercher...",
  emptyText = "Aucun résultat.",
  className,
  disabled = false,
  onCreateNew,
  createNewLabel = "Créer",
  isCreating = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const selectedOption = options.find((option) => option.value === value)

  const filteredOptions = React.useMemo(() => {
    if (!search) return options
    return options.filter((option) =>
      option.label.toLowerCase().includes(search.toLowerCase())
    )
  }, [options, search])

  const showCreateButton = onCreateNew && search && filteredOptions.length === 0

  const handleCreate = async () => {
    if (onCreateNew && search) {
      await onCreateNew(search)
      setSearch("")
      setOpen(false)
    }
  }

  // Smart scroll prevention - only prevent page scroll when dropdown can scroll
  const handleWheel = (e: React.WheelEvent) => {
    const element = scrollRef.current
    if (!element) return

    const { scrollTop, scrollHeight, clientHeight } = element
    const isScrollingDown = e.deltaY > 0
    const isScrollingUp = e.deltaY < 0

    // At bottom and trying to scroll down
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1
    // At top and trying to scroll up
    const isAtTop = scrollTop <= 1

    // Only prevent default if we're NOT at the edge
    if ((isScrollingDown && !isAtBottom) || (isScrollingUp && !isAtTop)) {
      e.stopPropagation()
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-between bg-background font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0 z-[200]" 
        align="start"
      >
        <div className="flex flex-col">
          {/* Search Input */}
          <div className="border-b px-3 py-2">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm outline-none placeholder:text-muted-foreground bg-transparent"
              autoFocus
            />
          </div>

          {/* Options List */}
          <div 
            ref={scrollRef}
            className="max-h-[250px] overflow-y-auto"
            onWheel={handleWheel}
          >
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center">
                {showCreateButton ? (
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm"
                    onClick={handleCreate}
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Création...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        {createNewLabel} "{search}"
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="text-sm text-muted-foreground">{emptyText}</div>
                )}
              </div>
            ) : (
              <div className="p-1">
                {filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => {
                      onChange(option.value)
                      setOpen(false)
                      setSearch("")
                    }}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                      value === option.value && "bg-accent"
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { motion, AnimatePresence } from "framer-motion"
import { Check, X } from "lucide-react"

import { cn } from "@/lib/utils"

const PremiumSwitch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => {
  const isChecked = props.checked || (props.defaultChecked && !props.checked)

  return (
    <SwitchPrimitives.Root
      className={cn(
        "peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-inner",
        "data-[state=checked]:bg-indigo-600 data-[state=unchecked]:bg-slate-200",
        "relative",
        className
      )}
      {...props}
      ref={ref}
    >
      {/* Background Icons */}
      <div className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none opacity-30">
        <X className="h-3 w-3 text-slate-500" strokeWidth={3} />
        <Check className="h-3 w-3 text-white" strokeWidth={3} />
      </div>

      <SwitchPrimitives.Thumb
        asChild
      >
        <motion.span
          layout
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30
          }}
          className={cn(
            "pointer-events-none block h-5.5 w-5.5 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] ring-0 transition-transform flex items-center justify-center overflow-hidden",
            "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
          )}
        >
            <AnimatePresence mode="wait">
                {isChecked ? (
                    <motion.div
                        key="check"
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 45 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Check className="h-3 w-3 text-indigo-600" strokeWidth={4} />
                    </motion.div>
                ) : (
                    <motion.div
                        key="x"
                        initial={{ scale: 0, rotate: 45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: -45 }}
                        transition={{ duration: 0.2 }}
                    >
                        <X className="h-3 w-3 text-slate-400" strokeWidth={4} />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.span>
      </SwitchPrimitives.Thumb>
    </SwitchPrimitives.Root>
  )
})
PremiumSwitch.displayName = "PremiumSwitch"

export { PremiumSwitch }

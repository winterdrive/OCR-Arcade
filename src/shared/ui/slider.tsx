import * as React from "react"
import { cn } from "@/shared/lib/utils"

const Slider = React.forwardRef<
    HTMLInputElement,
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value'> & {
        value?: number[]
        onValueChange?: (value: number[]) => void
    }
>(({ className, value, onValueChange, min, max, step, ...props }, ref) => {

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        onValueChange?.([parseFloat(e.target.value)])
    }

    return (
        <input
            type="range"
            className={cn(
                "w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary",
                className
            )}
            ref={ref}
            value={value?.[0] || 0}
            min={min}
            max={max}
            step={step}
            onChange={handleInput}
            {...props}
        />
    )
})
Slider.displayName = "Slider"

export { Slider }


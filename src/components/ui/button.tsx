import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-violet-600 text-white shadow hover:bg-violet-500 active:bg-violet-700",
        destructive:
          "bg-red-600 text-white shadow hover:bg-red-500 active:bg-red-700",
        outline:
          "border border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800 hover:text-white active:bg-zinc-900",
        secondary:
          "bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white active:bg-zinc-900",
        ghost:
          "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 active:bg-zinc-900",
        link: "text-violet-400 underline-offset-4 hover:underline",
        success:
          "bg-emerald-600 text-white shadow hover:bg-emerald-500 active:bg-emerald-700",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-7 rounded px-3 text-xs",
        lg: "h-11 rounded-md px-6 text-base",
        icon: "h-9 w-9",
        "icon-sm": "h-7 w-7 rounded",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { buttonVariants }

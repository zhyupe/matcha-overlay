import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ReactNode } from 'react'

import { cn } from '#lib/utils'

/** Mojito's buttons, at the overlay's compact sizes: 8px rounded rectangles with the faint raised finish */
const buttonVariants = cva(
  [
    'inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-control border font-medium',
    'finish-press duration-150 ease-out',
    'outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    'disabled:pointer-events-none disabled:opacity-45 data-disabled:pointer-events-none data-disabled:opacity-45',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        /** The one main action of an area */
        primary:
          'finish-primary border-transparent bg-lime text-lime-ink hover:bg-lime-hi active:bg-lime',
        /** Every other action */
        secondary:
          'finish-raised border-line-strong bg-surface text-fg hover:bg-muted active:bg-strong',
        /** Low-emphasis actions and toolbar icons */
        ghost:
          'border-transparent bg-transparent text-fg-2 hover:bg-hover hover:text-fg active:bg-muted',
      },
      size: {
        sm: 'h-7 px-2.5 text-sm [&_svg]:size-3.5',
        xs: 'h-6 px-2 text-xs [&_svg]:size-3.5',
      },
      icon: { true: 'px-0' },
    },
    compoundVariants: [
      { icon: true, size: 'sm', className: 'w-7' },
      { icon: true, size: 'xs', className: 'w-6' },
    ],
    defaultVariants: { variant: 'secondary', size: 'sm' },
  },
)

type Variants = Omit<VariantProps<typeof buttonVariants>, 'icon'>

function Button({
  className,
  variant,
  size,
  ...props
}: ButtonPrimitive.Props & Variants) {
  return (
    <ButtonPrimitive
      type="button"
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

/** A square button with only an icon; the label is its tooltip and accessible name */
function IconButton({
  label,
  variant = 'ghost',
  size = 'sm',
  className,
  children,
  ...props
}: Omit<ButtonPrimitive.Props, 'children'> &
  Variants & { label: string; children: ReactNode }) {
  return (
    <ButtonPrimitive
      type="button"
      aria-label={label}
      title={label}
      className={cn(buttonVariants({ variant, size, icon: true }), className)}
      {...props}
    >
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants, IconButton }

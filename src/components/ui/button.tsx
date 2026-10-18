import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

const variantes = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline: 'border border-input bg-card hover:bg-muted',
  ghost: 'hover:bg-muted',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  link: 'text-primary underline-offset-4 hover:underline px-0 min-h-0 h-auto',
}
const tamanhos = {
  default: 'min-h-11 px-4 text-sm',
  sm: 'min-h-11 md:min-h-9 px-3 text-sm',
  lg: 'min-h-12 px-5 text-base',
  icon: 'h-11 w-11 shrink-0',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantes
  size?: keyof typeof tamanhos
}

export function classesBotao(variant: keyof typeof variantes = 'default', size: keyof typeof tamanhos = 'default', className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
    variantes[variant],
    tamanhos[size],
    className,
  )
}

export function LinkBotao({ to, variant, size, className, children }: { to: string; variant?: keyof typeof variantes; size?: keyof typeof tamanhos; className?: string; children: React.ReactNode }) {
  return (
    <Link to={to} className={classesBotao(variant, size, className)}>
      {children}
    </Link>
  )
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = 'default', size = 'default', type = 'button', ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={classesBotao(variant, size, className)}
    {...props}
  />
))
Button.displayName = 'Button'

import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('rounded-md bg-muted [animation:skeleton_1.4s_ease-in-out_infinite]', className)} />
}

export function SkeletonLista({ linhas = 5 }: { linhas?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Carregando">
      {Array.from({ length: linhas }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
      <span className="sr-only">Carregando…</span>
    </div>
  )
}

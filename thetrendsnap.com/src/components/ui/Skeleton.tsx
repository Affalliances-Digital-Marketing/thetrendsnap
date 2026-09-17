import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-lg", className)} />;
}

export function CardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex gap-3 py-3">
        <Skeleton className="h-16 w-20 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <Skeleton className="aspect-[16/10] rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 4, compact = true }: { count?: number; compact?: boolean }) {
  return (
    <div className={compact ? "divide-y divide-ink-100 dark:divide-ink-800" : "grid gap-5 sm:grid-cols-2 lg:grid-cols-3"}>
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} compact={compact} />
      ))}
    </div>
  );
}

import { Skeleton } from '@/components/ui/skeleton';

export const SkeletonCard = () => {
  return (
    <div className="rounded-2xl overflow-hidden bg-card border shadow-sm flex flex-col h-full animate-pulse">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="p-5 space-y-4 flex-1 flex flex-col relative">
        <Skeleton className="h-5 w-3/4 rounded" />
        <div className="space-y-2">
           <Skeleton className="h-3.5 w-full rounded" />
           <Skeleton className="h-3.5 w-4/5 rounded" />
        </div>
        
        <div className="pt-4 mt-auto flex items-end justify-between">
          <Skeleton className="h-6 w-1/3 rounded" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export const SkeletonGrid = ({ count = 6 }: { count?: number }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};

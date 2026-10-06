import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto grid max-w-[1600px] gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div>
        <Skeleton className="aspect-video rounded-2xl" />
        <Skeleton className="mt-5 h-7 w-2/3" />
        <div className="mt-4 flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
        <Skeleton className="mt-4 h-24 rounded-xl" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="aspect-video w-40 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2 py-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

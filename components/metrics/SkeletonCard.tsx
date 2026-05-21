export function SkeletonCard() {
  return (
    <div className="bg-[var(--glass)] border border-[var(--border)] rounded-[24px] p-6 backdrop-blur-[20px] h-[180px] flex flex-col justify-between animate-pulse">
      <div>
        <div className="h-3 w-20 bg-zinc-800 rounded mb-4" />
        <div className="h-10 w-32 bg-zinc-800 rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-2 w-full bg-zinc-800 rounded" />
        <div className="h-2 w-2/3 bg-zinc-800 rounded" />
      </div>
    </div>
  )
}

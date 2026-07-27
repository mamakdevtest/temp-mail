export function SkeletonLine({ width = '100%', height = 10, className = '' }) {
  return <div className={`bg-brand-surface2/60 rounded animate-pulse ${className}`} style={{ width, height }} />;
}

export function InboxSkeleton() {
  return (
    <div className="p-3 space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-brand-surface2/60 animate-pulse mt-1.5 flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <SkeletonLine width={`${55 + Math.random() * 35}%`} height={10} />
            <SkeletonLine width={`${35 + Math.random() * 45}%`} height={8} />
          </div>
          <SkeletonLine width={32} height={8} />
        </div>
      ))}
    </div>
  );
}

export function EmailViewSkeleton() {
  return (
    <div className="p-5 space-y-4">
      <div className="space-y-2"><SkeletonLine width="35%" height={10} /><SkeletonLine width="55%" height={14} /><SkeletonLine width="40%" height={10} /></div>
      <div className="border-t border-brand-border/20 pt-4 space-y-2">
        <SkeletonLine width="100%" height={8} /><SkeletonLine width="92%" height={8} /><SkeletonLine width="88%" height={8} /><SkeletonLine width="75%" height={8} />
      </div>
    </div>
  );
}

export function StatsSkeleton({ count = 4 }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-${Math.min(count, 5)} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4 space-y-3">
          <SkeletonLine width="45%" height={8} />
          <SkeletonLine width="30%" height={22} />
          <SkeletonLine width="60%" height={7} />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-4 pb-3 border-b border-brand-border/20">
        {Array.from({ length: cols }).map((_, i) => <SkeletonLine key={i} width={`${70 / cols}%`} height={8} />)}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 items-center">
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonLine key={c} width={`${70 / cols}%`} height={c === 0 ? 12 : 8} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-2xl border border-brand-border/15">
          <SkeletonLine width={36} height={36} className="rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonLine width={`${45 + Math.random() * 30}%`} height={9} />
            <SkeletonLine width={`${25 + Math.random() * 30}%`} height={7} />
          </div>
          <SkeletonLine width={56} height={22} className="rounded-full" />
        </div>
      ))}
    </div>
  );
}

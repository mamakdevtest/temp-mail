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

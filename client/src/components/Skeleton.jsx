/**
 * Skeleton loader bileşenleri - veri yüklenirken gösterilir
 */
export function SkeletonLine({ width = '100%', height = 12, className = '' }) {
  return (
    <div
      className={`bg-gray-200 dark:bg-dark-700 rounded animate-pulse ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonCircle({ size = 40, className = '' }) {
  return (
    <div
      className={`bg-gray-200 dark:bg-dark-700 rounded-full animate-pulse ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function InboxSkeleton() {
  return (
    <div className="px-4 py-3 space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1.5">
            <SkeletonLine width={`${60 + Math.random() * 30}%`} height={10} />
            <SkeletonLine width={`${40 + Math.random() * 40}%`} height={8} />
          </div>
          <SkeletonLine width={40} height={8} />
        </div>
      ))}
    </div>
  );
}

export function EmailViewSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <SkeletonLine width="30%" height={10} />
        <SkeletonLine width="60%" height={14} />
        <SkeletonLine width="45%" height={10} />
      </div>
      <div className="border-t border-gray-100 dark:border-dark-700 pt-4 space-y-2">
        <SkeletonLine width="100%" height={10} />
        <SkeletonLine width="90%" height={10} />
        <SkeletonLine width="95%" height={10} />
        <SkeletonLine width="70%" height={10} />
        <SkeletonLine width="85%" height={10} />
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-dark-900 rounded-xl border border-gray-200 dark:border-dark-700 p-4 space-y-3">
      <SkeletonLine width="40%" height={12} />
      <SkeletonLine width="100%" height={8} />
      <SkeletonLine width="80%" height={8} />
    </div>
  );
}

export default function UsageLoading() {
  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-8 w-48" />
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-20" />
        ))}
      </div>

      <div className="space-y-3">
        <div className="skeleton h-4 w-32" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-12" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-12">
      <div className="space-y-3">
        <div className="skeleton h-6 w-28 rounded-full" />
        <div className="skeleton h-10 w-2/3 max-w-md" />
        <div className="skeleton h-4 w-1/2 max-w-sm" />
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="skeleton h-12 flex-1" />
          <div className="skeleton h-12 w-32" />
        </div>
        <div className="skeleton h-4 w-64" />
      </div>

      <div className="space-y-3">
        <div className="skeleton h-4 w-32" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-24" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProjectLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="skeleton h-7 w-56" />
          <div className="skeleton h-4 w-80" />
        </div>
        <div className="skeleton h-8 w-24 shrink-0 rounded-md" />
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-2">
          <div className="skeleton h-6 w-32 rounded" />
          <div className="skeleton h-6 w-24 rounded-md" />
        </div>
        <div className="skeleton h-[600px] rounded-none" />
      </div>

      <div className="flex gap-2">
        <div className="skeleton h-12 flex-1" />
        <div className="skeleton h-12 w-28" />
      </div>

      <div className="skeleton h-10 w-full" />
    </div>
  );
}

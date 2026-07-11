export function LoadingState({ label = "Loading data..." }: { label?: string }) {
  return (
    <div className="flex min-h-56 items-center justify-center rounded-xl border border-outline-variant bg-white">
      <div className="flex items-center gap-3 text-primary">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-label-md">{label}</span>
      </div>
    </div>
  );
}

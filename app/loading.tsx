export default function Loading() {
  return (
    <main className="min-h-screen bg-background px-5 py-8 text-on-background md:px-margin-page">
      <div className="mx-auto max-w-container-max">
        <div className="h-16 animate-pulse rounded-2xl bg-slate-200" />
        <div className="mt-10 max-w-3xl space-y-4">
          <div className="h-8 w-40 animate-pulse rounded-full bg-slate-200" />
          <div className="h-12 w-80 max-w-full animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-5 w-full animate-pulse rounded-full bg-slate-200" />
          <div className="h-5 w-4/5 animate-pulse rounded-full bg-slate-200" />
        </div>
      </div>
    </main>
  );
}

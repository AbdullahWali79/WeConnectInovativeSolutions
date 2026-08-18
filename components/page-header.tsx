export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex min-w-0 flex-col gap-3 sm:mb-8 sm:gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-primary sm:mb-2 sm:text-label-sm">{eyebrow}</p> : null}
        <h1 className="break-words text-2xl font-black leading-tight text-on-surface sm:text-headline-lg">{title}</h1>
        {description ? <p className="mt-1.5 max-w-3xl text-sm leading-6 text-on-surface-variant sm:mt-2 sm:text-body-lg">{description}</p> : null}
      </div>
      {action ? <div className="w-full shrink-0 md:w-auto">{action}</div> : null}
    </div>
  );
}

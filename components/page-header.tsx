export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? <p className="mb-2 text-label-sm uppercase tracking-widest text-primary">{eyebrow}</p> : null}
        <h1 className="text-headline-lg text-on-surface">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-body-lg text-on-surface-variant">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

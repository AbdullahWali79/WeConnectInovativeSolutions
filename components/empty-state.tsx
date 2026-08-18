import { Icon } from "./icon";

export function EmptyState({ title, description, icon = "inbox" }: { title: string; description: string; icon?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-6 text-center sm:p-10">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container text-primary">
        <Icon name={icon} />
      </div>
      <h3 className="text-lg font-bold text-on-surface sm:text-title-lg">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-on-surface-variant sm:text-body-md">{description}</p>
    </div>
  );
}

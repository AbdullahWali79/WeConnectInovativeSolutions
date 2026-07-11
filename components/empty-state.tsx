import { Icon } from "./icon";

export function EmptyState({ title, description, icon = "inbox" }: { title: string; description: string; icon?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container text-primary">
        <Icon name={icon} />
      </div>
      <h3 className="text-title-lg text-on-surface">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-body-md text-on-surface-variant">{description}</p>
    </div>
  );
}

import { CopyButton } from "@/components/admin/accounts-manager/accounts-manager";

export default function DevCopyPreview() {
  return (
    <div className="space-y-4 p-10">
      <CopyButton
        text="demo-secret-value"
        baseClassName="text-gray-400 hover:bg-blue-50 hover:text-blue-600"
        copiedClassName="bg-emerald-50 text-emerald-600"
        title="Copy"
      />
      <CopyButton
        text={"Jaz Cash\nTitle: Abdullah\nAcc: 03046983794"}
        baseClassName="bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
        copiedClassName="bg-emerald-50 text-emerald-600"
        title="Copy Info"
        showLabel
      />
    </div>
  );
}

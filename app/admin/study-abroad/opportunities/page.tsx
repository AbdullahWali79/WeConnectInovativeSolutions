"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Icon } from "@/components/icon";
import Link from "next/link";

type Opportunity = {
  id: string;
  title: string;
  description: string;
  image_url: string;
  original_link: string;
  is_published: boolean;
  created_at: string;
};

export default function OpportunitiesListPage() {
  const supabase = createSupabaseBrowserClient();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOpportunities = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("study_abroad_opportunities")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setOpportunities(data as Opportunity[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchOpportunities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this opportunity?")) return;
    
    const { error } = await supabase
      .from("study_abroad_opportunities")
      .delete()
      .eq("id", id);
      
    if (error) {
      console.error("Delete failed", error);
      alert("Failed to delete.");
    } else {
      setOpportunities(prev => prev.filter(opp => opp.id !== id));
    }
  };

  const togglePublish = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("study_abroad_opportunities")
      .update({ is_published: !currentStatus })
      .eq("id", id);

    if (error) {
      console.error("Toggle publish failed", error);
    } else {
      setOpportunities(prev => 
        prev.map(opp => opp.id === id ? { ...opp, is_published: !currentStatus } : opp)
      );
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Study Abroad Opportunities</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your fetched and published study abroad opportunities.
          </p>
        </div>
        <Link
          href="/admin/study-abroad/add"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:brightness-110"
        >
          <Icon name="add" />
          Add New
        </Link>
      </div>

      <div className="rounded-xl border bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Original Link</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    Loading opportunities...
                  </td>
                </tr>
              ) : opportunities.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    No opportunities found. Click "Add New" to create one.
                  </td>
                </tr>
              ) : (
                opportunities.map((opp) => (
                  <tr key={opp.id} className="transition hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{opp.title}</div>
                      <div className="line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
                        {opp.description}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {opp.original_link ? (
                        <a 
                          href={opp.original_link} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          View Source
                        </a>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => togglePublish(opp.id, opp.is_published)}
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          opp.is_published
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {opp.is_published ? "Published" : "Draft"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDelete(opp.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Delete"
                        >
                          <Icon name="delete" className="text-[20px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

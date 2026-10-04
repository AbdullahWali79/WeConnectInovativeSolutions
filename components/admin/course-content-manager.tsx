/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Toast, type ToastState } from "@/components/toast";
import { getCourseLessons, importFromGoogleDriveFolder, deleteLesson, reorderLessons } from "@/app/admin/courses/[id]/content/actions";

export function CourseContentManager({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  
  const [folderUrl, setFolderUrl] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadLessons();
  }, [courseId]);

  async function loadLessons() {
    setLoading(true);
    const res = await getCourseLessons(courseId);
    if (res.error) {
      setToast({ type: "error", message: res.error });
    } else {
      setLessons(res.data || []);
    }
    setLoading(false);
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!folderUrl) return;
    setImporting(true);
    const res = await importFromGoogleDriveFolder(courseId, folderUrl);
    if (res.ok) {
      setToast({ type: "success", message: `Imported ${res.count} videos successfully!` });
      setFolderUrl("");
      loadLessons();
    } else {
      setToast({ type: "error", message: res.error || "Failed to import." });
    }
    setImporting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to remove this video?")) return;
    const res = await deleteLesson(id, courseId);
    if (res.ok) {
      loadLessons();
    } else {
      setToast({ type: "error", message: res.error || "Failed to delete" });
    }
  }

  const moveUp = async (index: number) => {
    if (index === 0) return;
    const newLessons = [...lessons];
    const temp = newLessons[index];
    newLessons[index] = newLessons[index - 1];
    newLessons[index - 1] = temp;
    setLessons(newLessons);
    await reorderLessons(courseId, newLessons.map(l => l.id));
  };

  const moveDown = async (index: number) => {
    if (index === lessons.length - 1) return;
    const newLessons = [...lessons];
    const temp = newLessons[index];
    newLessons[index] = newLessons[index + 1];
    newLessons[index + 1] = temp;
    setLessons(newLessons);
    await reorderLessons(courseId, newLessons.map(l => l.id));
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <Toast toast={toast} onClear={() => setToast(null)} />
      
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/courses" className="p-2 rounded-xl bg-[#1e2330] border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800 transition">
          <Icon name="arrow_back" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white leading-tight">{courseTitle}</h1>
          <p className="text-sm text-gray-400">Manage Course Curriculum</p>
        </div>
      </div>

      <div className="bg-[#1e2330] rounded-xl border border-gray-800 p-6">
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <Icon name="add_to_drive" className="text-emerald-500" /> Import from Google Drive
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Paste a public Google Drive folder URL containing your course videos. The system will automatically fetch all videos and add them to this course in alphabetical order. Make sure you have connected Google Drive in Settings.
        </p>
        
        <form onSubmit={handleImport} className="flex flex-col sm:flex-row gap-3">
          <input 
            type="url" 
            required 
            placeholder="https://drive.google.com/drive/folders/..." 
            className="flex-1 bg-[#151923] border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-emerald-500 outline-none"
            value={folderUrl}
            onChange={e => setFolderUrl(e.target.value)}
          />
          <button disabled={importing} type="submit" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2">
            {importing ? <Icon name="sync" className="animate-spin" /> : <Icon name="cloud_download" />} 
            {importing ? "Importing..." : "Sync Videos"}
          </button>
        </form>
      </div>

      <div className="bg-[#1e2330] rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800 bg-[#151923] flex justify-between items-center">
          <h3 className="font-bold text-white">Course Curriculum</h3>
          <span className="text-xs font-bold text-gray-400 bg-gray-800 px-3 py-1 rounded-full">{lessons.length} Lessons</span>
        </div>
        
        <div className="divide-y divide-gray-800">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading curriculum...</div>
          ) : lessons.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center text-gray-500">
              <Icon name="video_library" className="text-4xl mb-3 opacity-50" />
              <p>No videos added yet.</p>
              <p className="text-sm mt-1">Import a Google Drive folder above to get started.</p>
            </div>
          ) : (
            lessons.map((lesson, index) => (
              <div key={lesson.id} className="p-4 flex items-center gap-4 hover:bg-[#151923] transition group">
                <div className="flex flex-col gap-1 opacity-20 group-hover:opacity-100 transition">
                  <button onClick={() => moveUp(index)} disabled={index === 0} className="text-gray-400 hover:text-white disabled:opacity-20"><Icon name="keyboard_arrow_up" className="text-[20px] block" /></button>
                  <button onClick={() => moveDown(index)} disabled={index === lessons.length - 1} className="text-gray-400 hover:text-white disabled:opacity-20"><Icon name="keyboard_arrow_down" className="text-[20px] block" /></button>
                </div>
                
                <div className="w-10 h-10 rounded-lg bg-blue-900/30 text-blue-500 flex items-center justify-center shrink-0 font-bold">
                  {index + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white truncate">{lesson.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                      <Icon name="link" className="text-[12px]" /> {lesson.drive_file_id}
                    </span>
                  </div>
                </div>
                
                <div className="shrink-0 flex gap-2">
                  <a href={`https://drive.google.com/file/d/${lesson.drive_file_id}/view`} target="_blank" rel="noreferrer" className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition">
                    <Icon name="visibility" className="text-[18px] block" />
                  </a>
                  <button onClick={() => handleDelete(lesson.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-900/30 transition">
                    <Icon name="delete" className="text-[18px] block" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

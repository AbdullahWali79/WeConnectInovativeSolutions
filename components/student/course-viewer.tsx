/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Toast, type ToastState } from "@/components/toast";
import { getStudentCourseData, markLessonComplete } from "@/app/student/courses/[id]/actions";

export function CourseViewer({ courseId }: { courseId: string }) {
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [progress, setProgress] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastState>(null);

  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [marking, setMarking] = useState(false);
  
  // Anti-skip: Require user to stay on video for a while before marking complete
  const [canComplete, setCanComplete] = useState(false);

  useEffect(() => {
    loadData();
  }, [courseId]);

  useEffect(() => {
    if (activeLesson && !progress.includes(activeLesson.id)) {
      setCanComplete(false);
      // Wait 10 seconds before enabling the complete button (to simulate watching)
      const timer = setTimeout(() => setCanComplete(true), 10000);
      return () => clearTimeout(timer);
    } else {
      setCanComplete(true);
    }
  }, [activeLesson, progress]);

  async function loadData() {
    setLoading(true);
    const res = await getStudentCourseData(courseId);
    if (res.error) {
      setToast({ type: "error", message: res.error });
    } else {
      setCourse(res.course);
      setLessons(res.lessons);
      setProgress(res.progress);

      // Set active lesson to the first UNCOMPLETED lesson, or the very last lesson if all completed
      if (res.lessons.length > 0) {
        const firstUncompleted = res.lessons.find((l: any) => !res.progress.includes(l.id));
        setActiveLesson(firstUncompleted || res.lessons[res.lessons.length - 1]);
      }
    }
    setLoading(false);
  }

  const handleComplete = async () => {
    if (!activeLesson) return;
    setMarking(true);
    const res = await markLessonComplete(courseId, activeLesson.id);
    if (res.ok) {
      const newProgress = [...progress, activeLesson.id];
      setProgress(newProgress);
      
      // Move to next lesson automatically
      const currentIndex = lessons.findIndex((l) => l.id === activeLesson.id);
      if (currentIndex !== -1 && currentIndex < lessons.length - 1) {
        setActiveLesson(lessons[currentIndex + 1]);
      } else {
        setToast({ type: "success", message: "Congratulations! You completed the course." });
      }
    } else {
      setToast({ type: "error", message: res.error || "Failed to mark complete" });
    }
    setMarking(false);
  };

  if (loading) {
    return <div className="p-10 text-center text-white">Loading Course...</div>;
  }

  if (!course) {
    return <div className="p-10 text-center text-red-400">Course not found.</div>;
  }

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-80px)] bg-[#0d1117]">
      <Toast toast={toast} onClear={() => setToast(null)} />
      
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col border-r border-gray-800">
        <div className="p-4 border-b border-gray-800 bg-[#161b22] flex items-center gap-3">
          <Link href="/student/courses" className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition">
            <Icon name="arrow_back" />
          </Link>
          <h1 className="text-xl font-bold text-white truncate">{course.title}</h1>
        </div>

        <div className="flex-1 bg-black flex flex-col items-center justify-center relative p-4 lg:p-10">
          {activeLesson ? (
            <div className="w-full max-w-4xl w-full aspect-video relative bg-[#161b22] rounded-xl overflow-hidden shadow-2xl border border-gray-800">
              
              {/* Google Drive Iframe */}
              <iframe 
                src={`https://drive.google.com/file/d/${activeLesson.drive_file_id}/preview`} 
                width="100%" 
                height="100%" 
                allow="autoplay; fullscreen"
                className="w-full h-full border-0"
              ></iframe>

              {/* SECURITY OVERLAY: Blocks the top right corner where the Pop-out button is located in Google Drive iframe */}
              <div 
                className="absolute top-0 right-0 w-24 h-20 bg-transparent z-10" 
                title="Pop-out disabled for security"
                onContextMenu={(e) => e.preventDefault()}
              ></div>

            </div>
          ) : (
            <div className="text-gray-500">No lessons available in this course.</div>
          )}

          {activeLesson && (
            <div className="w-full max-w-4xl mt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">{activeLesson.title}</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Lesson {lessons.findIndex(l => l.id === activeLesson.id) + 1} of {lessons.length}
                </p>
              </div>

              {!progress.includes(activeLesson.id) ? (
                <button 
                  onClick={handleComplete} 
                  disabled={marking || !canComplete}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center gap-2 transition"
                >
                  <Icon name={marking ? "sync" : "check_circle"} className={marking ? "animate-spin" : ""} />
                  {canComplete ? "Mark as Completed & Next" : "Watch video to complete..."}
                </button>
              ) : (
                <div className="px-6 py-3 bg-emerald-900/30 text-emerald-500 border border-emerald-900 font-bold rounded-xl flex items-center gap-2">
                  <Icon name="verified" /> Completed
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Playlist Sidebar */}
      <div className="w-full lg:w-[400px] bg-[#161b22] flex flex-col h-full lg:h-[calc(100vh-80px)]">
        <div className="p-5 border-b border-gray-800 shrink-0">
          <h3 className="font-bold text-white text-lg">Course Curriculum</h3>
          <div className="mt-2 w-full bg-gray-800 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full transition-all duration-500" 
              style={{ width: `${lessons.length > 0 ? (progress.length / lessons.length) * 100 : 0}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-400 mt-2 font-bold">{progress.length} of {lessons.length} completed</p>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-800/50 p-2">
          {lessons.map((lesson, index) => {
            const isCompleted = progress.includes(lesson.id);
            const isPrevCompleted = index === 0 || progress.includes(lessons[index - 1].id);
            const isLocked = !isCompleted && !isPrevCompleted;
            const isActive = activeLesson?.id === lesson.id;

            return (
              <button
                key={lesson.id}
                disabled={isLocked}
                onClick={() => setActiveLesson(lesson)}
                className={`w-full text-left p-4 rounded-xl flex items-start gap-3 transition-colors ${
                  isActive ? "bg-blue-900/20 border border-blue-900/50" :
                  isLocked ? "opacity-50 cursor-not-allowed hover:bg-transparent" :
                  "hover:bg-gray-800/50"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  isCompleted ? "bg-emerald-500/20 text-emerald-500" :
                  isActive ? "bg-blue-500/20 text-blue-500" :
                  "bg-gray-800 text-gray-400"
                }`}>
                  <Icon name={isCompleted ? "check" : isLocked ? "lock" : "play_arrow"} className="text-[16px]" />
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${isActive ? "text-blue-400" : "text-gray-300"}`}>
                    {index + 1}. {lesson.title}
                  </h4>
                  <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider font-bold">
                    {isCompleted ? "Completed" : isLocked ? "Locked" : "Available"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

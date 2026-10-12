/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Icon } from "@/components/icon";
import { 
  QURAN_SURAHS, 
  QURAN_TRANSLATORS, 
  buildDetailedTafseerPrompt, 
  buildShortPrompt 
} from "@/lib/quran-data";

interface ReadableQuranModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReadableQuranModal({ isOpen, onClose }: ReadableQuranModalProps) {
  // Navigation & selection
  const [surahNumber, setSurahNumber] = useState<number>(2); // Default Surah Al-Baqara
  const [ayahNumber, setAyahNumber] = useState<number>(67);  // Default Ayah 67 as shown in user image
  const [translator, setTranslator] = useState<string>("ur.jalandhry");

  // Display customizations
  const [fontSize, setFontSize] = useState<number>(28);
  const [fontFamily, setFontFamily] = useState<string>("Serif");

  // Content state
  const [arabicText, setArabicText] = useState<string>("");
  const [urduText, setUrduText] = useState<string>("");
  const [juzNumber, setJuzNumber] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Jump selector state
  const [isJumpOpen, setIsJumpOpen] = useState<boolean>(false);
  const [jumpSurah, setJumpSurah] = useState<number>(2);
  const [jumpAyah, setJumpAyah] = useState<number>(67);

  // Copy feedback
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const currentSurah = useMemo(() => {
    return QURAN_SURAHS.find(s => s.number === surahNumber) || QURAN_SURAHS[1];
  }, [surahNumber]);

  // Load last read position from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("weconnect_quran_last_read");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.surah && parsed.ayah) {
            setSurahNumber(parsed.surah);
            setAyahNumber(parsed.ayah);
            setJumpSurah(parsed.surah);
            setJumpAyah(parsed.ayah);
          }
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Save current position
  useEffect(() => {
    if (typeof window !== "undefined" && surahNumber && ayahNumber) {
      try {
        localStorage.setItem("weconnect_quran_last_read", JSON.stringify({ surah: surahNumber, ayah: ayahNumber }));
      } catch {
        // ignore
      }
    }
  }, [surahNumber, ayahNumber]);

  // Fetch Ayah data from API
  const fetchAyah = useCallback(async (surah: number, ayah: number, trans: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/editions/quran-uthmani,${trans}`, {
        cache: "force-cache"
      });
      const data = await res.json();
      if (data.code === 200 && Array.isArray(data.data) && data.data.length >= 2) {
        setArabicText(data.data[0].text);
        setUrduText(data.data[1].text);
        setJuzNumber(data.data[0].juz || 1);
      } else {
        setError("Ayat load karnay mein masla hua. Dobara koshish karein.");
      }
    } catch {
      setError("Network masla. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchAyah(surahNumber, ayahNumber, translator);
    }
  }, [isOpen, surahNumber, ayahNumber, translator, fetchAyah]);

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (ayahNumber < currentSurah.numberOfAyahs) {
      setAyahNumber(prev => prev + 1);
    } else if (surahNumber < 114) {
      // Jump to next Surah
      const nextSurah = surahNumber + 1;
      setSurahNumber(nextSurah);
      setAyahNumber(1);
    }
  }, [ayahNumber, currentSurah.numberOfAyahs, surahNumber]);

  const handlePrev = useCallback(() => {
    if (ayahNumber > 1) {
      setAyahNumber(prev => prev - 1);
    } else if (surahNumber > 1) {
      // Jump to previous Surah's last Ayah
      const prevSurahNum = surahNumber - 1;
      const prevSurahMeta = QURAN_SURAHS.find(s => s.number === prevSurahNum);
      setSurahNumber(prevSurahNum);
      setAyahNumber(prevSurahMeta ? prevSurahMeta.numberOfAyahs : 1);
    }
  }, [ayahNumber, surahNumber]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  // Copy Prompt
  const handleCopyPrompt = (type: "detailed" | "short") => {
    const text = type === "detailed"
      ? buildDetailedTafseerPrompt(currentSurah.englishName, ayahNumber, arabicText, urduText)
      : buildShortPrompt(currentSurah.englishName, ayahNumber, arabicText, urduText);

    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Open in AI (ChatGPT)
  const handleOpenInAI = (type: "detailed" | "short" = "detailed") => {
    handleCopyPrompt(type);
    window.open("https://chatgpt.com", "_blank");
  };

  const fontStyle = useMemo(() => {
    if (fontFamily === "Serif") {
      return { fontFamily: "'Amiri', 'Traditional Arabic', 'Scheherazade New', serif" };
    }
    if (fontFamily === "Naskh / Amiri") {
      return { fontFamily: "'Amiri', 'Noto Naskh Arabic', 'Traditional Arabic', serif" };
    }
    if (fontFamily === "Nastaliq") {
      return { fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif" };
    }
    return { fontFamily: "system-ui, -apple-system, sans-serif" };
  }, [fontFamily]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-5 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl flex flex-col border border-gray-200 overflow-hidden my-auto max-h-[96vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header & Controls */}
        <div className="bg-slate-50/90 border-b border-gray-200 p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Title Area */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold tracking-widest text-emerald-700 uppercase">
                  READABLE QURAN
                </span>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  Juz {juzNumber}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5 flex items-center gap-2">
                <span>{currentSurah.englishName}</span>
                <span className="text-emerald-700 font-bold text-lg">{surahNumber}:{ayahNumber}</span>
                <span className="text-sm font-normal text-gray-500 font-arabic">({currentSurah.name})</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Arabic aur Urdu translation ko apni readability ke hisaab se adjust karein.
              </p>
            </div>

            {/* Row 1 Controls: Font Size, Font, Translator, Prompt buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Font Size Stepper */}
              <div className="flex items-center border border-gray-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                <button 
                  type="button"
                  onClick={() => setFontSize(s => Math.max(18, s - 2))}
                  className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-bold text-sm transition-colors cursor-pointer"
                  title="Font chota karein"
                >
                  −
                </button>
                <span className="px-2 text-xs font-bold text-gray-800 select-none min-w-[42px] text-center">
                  {fontSize}px
                </span>
                <button 
                  type="button"
                  onClick={() => setFontSize(s => Math.min(56, s + 2))}
                  className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-bold text-sm transition-colors cursor-pointer"
                  title="Font bara karein"
                >
                  +
                </button>
              </div>

              {/* Font Family Dropdown */}
              <select 
                value={fontFamily} 
                onChange={e => setFontFamily(e.target.value)}
                className="bg-white border border-gray-300 rounded-lg py-1.5 px-2 text-xs font-semibold text-gray-800 outline-none focus:border-primary shadow-2xs cursor-pointer"
              >
                <option value="Serif">Serif</option>
                <option value="Naskh / Amiri">Amiri / Naskh</option>
                <option value="Nastaliq">Nastaliq</option>
                <option value="Sans">Sans-Serif</option>
              </select>

              {/* Translator Selector */}
              <select 
                value={translator} 
                onChange={e => setTranslator(e.target.value)}
                className="bg-white border border-gray-300 rounded-lg py-1.5 px-2.5 text-xs font-semibold text-gray-800 outline-none focus:border-primary shadow-2xs cursor-pointer max-w-[170px] truncate"
              >
                {QURAN_TRANSLATORS.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>

              {/* Copy Prompt Button */}
              <button 
                type="button"
                onClick={() => handleCopyPrompt("detailed")}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                  copiedType === "detailed" 
                    ? "bg-emerald-50 border-emerald-400 text-emerald-700" 
                    : "border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800"
                }`}
                title="AI ke liye Tafseer prompt copy karein"
              >
                <Icon name={copiedType === "detailed" ? "check" : "content_copy"} className="text-[14px]" />
                {copiedType === "detailed" ? "Copied!" : "Copy Prompt"}
              </button>

              {/* AI Tafseer Button */}
              <button 
                type="button"
                onClick={() => handleOpenInAI("detailed")}
                className="px-3 py-1.5 rounded-lg border border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                title="Tafseer prompt copy kar k ChatGPT kholein"
              >
                <Icon name="smart_toy" className="text-[14px] text-teal-700" />
                AI Tafseer
              </button>
            </div>
          </div>

          {/* Row 2 Controls: Open in AI, Copy Short Prompt, Prev, Next, Jump, Close */}
          <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-gray-200/80 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Open in AI */}
              <button 
                type="button"
                onClick={() => handleOpenInAI("detailed")}
                className="px-3 py-1.5 rounded-lg border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <Icon name="open_in_new" className="text-[14px]" />
                Open in AI
              </button>

              {/* Copy Short Prompt */}
              <button 
                type="button"
                onClick={() => handleCopyPrompt("short")}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                  copiedType === "short" 
                    ? "bg-emerald-50 border-emerald-400 text-emerald-700" 
                    : "border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                }`}
              >
                <Icon name={copiedType === "short" ? "check" : "content_copy"} className="text-[14px]" />
                Copy Short Prompt (مختصر)
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap ml-auto">
              {/* Previous Ayah */}
              <button 
                type="button"
                onClick={handlePrev}
                disabled={surahNumber === 1 && ayahNumber === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 text-gray-700 text-xs font-bold flex items-center gap-1 transition-all shadow-2xs cursor-pointer disabled:cursor-not-allowed"
              >
                <Icon name="chevron_left" className="text-[16px]" />
                Previous
              </button>

              {/* Next Ayah */}
              <button 
                type="button"
                onClick={handleNext}
                disabled={surahNumber === 114 && ayahNumber === currentSurah.numberOfAyahs}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed"
              >
                Next
                <Icon name="chevron_right" className="text-[16px]" />
              </button>

              {/* Jump to Surah / Ayah */}
              <button 
                type="button"
                onClick={() => setIsJumpOpen(v => !v)}
                className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                title="Kisi bhi Surah ya Ayat par direct jayein"
              >
                <Icon name={isJumpOpen ? "lock_open" : "lock"} className="text-[14px]" />
                {isJumpOpen ? "Selecting..." : "Unlock / Jump"}
              </button>

              {/* Close Modal */}
              <button 
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>
          </div>

          {/* Jump Popup Drawer */}
          {isJumpOpen && (
            <div className="mt-3 p-3 bg-white border border-amber-200 rounded-xl shadow-md flex items-center gap-3 flex-wrap animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-700">Surah:</label>
                <select 
                  value={jumpSurah}
                  onChange={e => {
                    const sNum = Number(e.target.value);
                    setJumpSurah(sNum);
                    setJumpAyah(1);
                  }}
                  className="bg-gray-50 border border-gray-300 rounded-lg p-1.5 text-xs font-medium text-gray-900 outline-none"
                >
                  {QURAN_SURAHS.map(s => (
                    <option key={s.number} value={s.number}>
                      {s.number}. {s.englishName} ({s.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-700">Ayah:</label>
                <input 
                  type="number"
                  min={1}
                  max={QURAN_SURAHS.find(s => s.number === jumpSurah)?.numberOfAyahs || 286}
                  value={jumpAyah}
                  onChange={e => setJumpAyah(Math.max(1, Number(e.target.value)))}
                  className="w-20 bg-gray-50 border border-gray-300 rounded-lg p-1.5 text-xs font-medium text-gray-900 outline-none"
                />
                <span className="text-[11px] text-gray-500">
                  / {QURAN_SURAHS.find(s => s.number === jumpSurah)?.numberOfAyahs}
                </span>
              </div>

              <button 
                type="button"
                onClick={() => {
                  setSurahNumber(jumpSurah);
                  setAyahNumber(jumpAyah);
                  setIsJumpOpen(false);
                }}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Go to Ayah
              </button>
            </div>
          )}
        </div>

        {/* Ayah Content Area */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-radial from-slate-50 to-white min-h-[380px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent" />
              <p className="text-sm font-semibold text-emerald-800">Ayat load ho rahi hai...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 space-y-3">
              <Icon name="error" className="text-4xl text-red-500" />
              <p className="text-sm font-bold text-red-600">{error}</p>
              <button 
                type="button"
                onClick={() => fetchAyah(surahNumber, ayahNumber, translator)}
                className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="w-full max-w-4xl space-y-8 text-center">
              {/* Arabic Text Card */}
              <div className="p-6 sm:p-10 rounded-2xl border-2 border-emerald-200/80 bg-white shadow-xs">
                <p 
                  dir="rtl"
                  style={{ fontSize: `${fontSize}px`, ...fontStyle }}
                  className="leading-[2.4] text-gray-900 select-all font-normal"
                >
                  {arabicText}
                </p>

                {/* Urdu Translation */}
                <div className="mt-8 pt-8 border-t border-gray-100">
                  <p 
                    dir="rtl"
                    style={{ 
                      fontSize: `${Math.max(16, Math.round(fontSize * 0.72))}px`,
                      fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', serif"
                    }}
                    className="leading-[2.4] text-gray-800 select-all font-medium"
                  >
                    {urduText}
                  </p>
                </div>
              </div>

              {/* Subtitle / Surah reference under card */}
              <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold">
                {currentSurah.englishName} - <span className="font-arabic">{currentSurah.name}</span>
              </p>

              {/* Bottom Quick Action Hints */}
              <div className="flex items-center justify-center gap-6 text-[11px] text-gray-400">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-gray-600 font-mono text-[10px]">←</kbd>
                  Previous
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-gray-600 font-mono text-[10px]">→</kbd>
                  Next
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-gray-600 font-mono text-[10px]">ESC</kbd>
                  Close
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

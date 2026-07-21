"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { PromotionalPopup } from "@/lib/supabase/types";

interface PromoPopupProps {
  context: "landing" | "student";
}

export function PromoPopup({ context }: PromoPopupProps) {
  const [popup, setPopup] = useState<PromotionalPopup | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function fetchPopup() {
      const supabase = createSupabasePublicClient();
      const { data } = await supabase
        .from("promotional_popups")
        .select("*")
        .eq("is_active", true)
        .or(`show_on.eq.${context},show_on.eq.both`)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setPopup(data);
        // Check if user has already dismissed this popup
        const dismissedId = localStorage.getItem(`promo_popup_dismissed_${context}`);
        if (dismissedId !== data.id) {
          // Small delay for dramatic entrance
          setTimeout(() => setIsVisible(true), 800);
        }
      }
      setIsLoaded(true);
    }

    // Check for preview mode
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("preview_popup") === "1") {
      const previewData = sessionStorage.getItem("promo_popup_preview");
      if (previewData) {
        setPopup(JSON.parse(previewData));
        setIsVisible(true);
        setIsLoaded(true);
        return;
      }
    }

    void fetchPopup();
  }, [context]);

  function dismiss() {
    setIsVisible(false);
    if (popup && !window.location.search.includes("preview_popup")) {
      localStorage.setItem(`promo_popup_dismissed_${context}`, popup.id);
    }
  }

  if (!isLoaded || !popup) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={dismiss}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 30 }}
            transition={{ type: "spring", duration: 0.6, bounce: 0.3 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
          >
            {/* Close button */}
            <button
              onClick={dismiss}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--wc-surface-lowest)] text-on-surface backdrop-blur-sm transition hover:bg-black/40"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>

            {/* Image */}
            {popup.image_url && (
              <div className="relative h-52 w-full overflow-hidden">
                <Image
                  src={popup.image_url}
                  alt={popup.title}
                  fill
                  sizes="min(100vw, 512px)"
                  unoptimized
                  className="object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
            )}

            {/* Content */}
            <div className={`p-6 ${popup.image_url ? "-mt-8 relative" : "pt-8"}`}>
              {/* Animated title */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-center text-2xl font-black tracking-tight text-primary dark:text-blue-400"
              >
                <AnimatedText text={popup.title} />
              </motion.h2>

              {/* Message */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="mt-4"
              >
                {formatMessage(popup.message)}
              </motion.div>

              {/* CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.4 }}
                className="mt-6 flex justify-center"
              >
                <button
                  onClick={dismiss}
                  className="rounded-xl bg-primary px-8 py-3 text-sm font-bold text-on-surface shadow-lg shadow-primary/30 transition hover:scale-105 hover:shadow-xl dark:bg-blue-500"
                >
                  Got it!
                </button>
              </motion.div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl dark:bg-blue-500/10" />
            <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-secondary-container/30 blur-3xl dark:bg-amber-500/10" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function formatMessage(message: string) {
  if (!message) return null;

  let processed = message;
  const symbols = ["✅", "🎯", "•", "✔", "➖", "✨", "⭐", "🔹", "▪", "📌"];

  // Cleanly split and rejoin to add newlines before symbols
  symbols.forEach((sym) => {
    processed = processed
      .split(sym)
      .map((part, idx) => {
        if (idx === 0) return part;
        return "\n" + sym + " " + part.trim();
      })
      .join("");
  });

  const lines = processed
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const blocks: React.ReactNode[] = [];
  let currentList: { text: string; icon: string }[] = [];

  const flushList = (key: number) => {
    if (currentList.length > 0) {
      blocks.push(
        <ul
          key={`list-${key}`}
          className="my-3.5 space-y-2.5 text-left max-w-md mx-auto px-2 md:px-4"
        >
          {currentList.map((item, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-350 transition-transform duration-200 hover:translate-x-1"
            >
              <span className="flex-shrink-0 text-base leading-none select-none mt-0.5 scale-100 hover:scale-110 transition-transform">
                {item.icon}
              </span>
              <span className="leading-relaxed font-medium">{item.text}</span>
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, idx) => {
    let matchedSymbol = "";
    let matchedText = "";

    for (const sym of symbols) {
      if (line.startsWith(sym)) {
        matchedSymbol = sym;
        matchedText = line.substring(sym.length).trim();
        break;
      }
    }

    if (matchedSymbol) {
      currentList.push({ text: matchedText, icon: matchedSymbol });
    } else {
      flushList(idx);

      const isHeader =
        line.includes("Alternative Short Version:") ||
        line.toLowerCase().startsWith("alternative");
      const isCallToAction =
        line.toLowerCase().startsWith("apply now") ||
        line.toLowerCase().startsWith("register now");

      if (isHeader) {
        blocks.push(
          <div
            key={idx}
            className="mt-5 mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3 text-center"
          >
            {line}
          </div>
        );
      } else if (isCallToAction) {
        blocks.push(
          <p
            key={idx}
            className="mt-3.5 text-sm font-semibold text-center text-primary dark:text-blue-400 tracking-wide uppercase px-2"
          >
            {line}
          </p>
        );
      } else {
        blocks.push(
          <p
            key={idx}
            className="mt-3 text-sm text-center leading-relaxed text-slate-600 dark:text-slate-300 font-normal px-2 md:px-4"
          >
            {line}
          </p>
        );
      }
    }
  });

  flushList(lines.length);

  return <div className="space-y-1.5">{blocks}</div>;
}

function AnimatedText({ text }: { text: string }) {
  const [displayText, setDisplayText] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index <= text.length) {
        setDisplayText(text.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
        // Blink cursor after typing
        const blink = setInterval(() => {
          setShowCursor((prev) => !prev);
        }, 500);
        return () => clearInterval(blink);
      }
    }, 60);

    return () => clearInterval(interval);
  }, [text]);

  return (
    <span className="inline-flex items-center">
      <span className="bg-gradient-to-r from-primary via-blue-600 to-primary bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-x dark:from-blue-400 dark:via-blue-300 dark:to-blue-400">
        {displayText}
      </span>
      <motion.span
        animate={{ opacity: showCursor ? 1 : 0 }}
        transition={{ duration: 0.1 }}
        className="ml-0.5 inline-block h-6 w-0.5 bg-primary dark:bg-blue-400"
      />
    </span>
  );
}

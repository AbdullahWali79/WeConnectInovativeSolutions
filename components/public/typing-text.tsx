"use client";

import { useEffect, useMemo, useState } from "react";

export function TypingText({
  text,
  className = "",
  speed = 90,
  startDelay = 200,
  holdDelay = 3000,
  cursorClassName = "bg-[#FFD24A]",
}: {
  text: string | string[];
  className?: string;
  speed?: number;
  startDelay?: number;
  holdDelay?: number;
  cursorClassName?: string;
}) {
  const [displayedText, setDisplayedText] = useState("");
  const phrases = useMemo(() => (Array.isArray(text) ? text : [text]), [text]);

  useEffect(() => {
    setDisplayedText("");

    let activeTimeout: number | undefined;
    let activeInterval: number | undefined;
    let cancelled = false;

    const clearActiveTimers = () => {
      if (activeTimeout) window.clearTimeout(activeTimeout);
      if (activeInterval) window.clearInterval(activeInterval);
    };

    const typePhrase = (phraseIndex: number) => {
      if (cancelled) return;

      const phrase = phrases[phraseIndex % phrases.length] ?? "";
      let index = 0;
      setDisplayedText("");

      activeInterval = window.setInterval(() => {
        index += 1;
        setDisplayedText(phrase.slice(0, index));

        if (index >= phrase.length) {
          if (activeInterval) window.clearInterval(activeInterval);
          activeTimeout = window.setTimeout(() => {
            if (cancelled) return;

            let deleteIndex = phrase.length;
            activeInterval = window.setInterval(() => {
              deleteIndex -= 1;
              setDisplayedText(phrase.slice(0, Math.max(deleteIndex, 0)));

              if (deleteIndex <= 0) {
                if (activeInterval) window.clearInterval(activeInterval);
                activeTimeout = window.setTimeout(() => typePhrase(phraseIndex + 1), 350);
              }
            }, Math.max(30, Math.floor(speed * 0.6)));
          }, holdDelay);
        }
      }, speed);
    };

    activeTimeout = window.setTimeout(() => typePhrase(0), startDelay);

    return () => {
      cancelled = true;
      clearActiveTimers();
    };
  }, [holdDelay, phrases, speed, startDelay]);

  return (
    <span
      className={`inline-block max-w-full min-w-0 whitespace-normal align-baseline ${className}`}
      style={{ lineHeight: 1.08, minHeight: "1.2em" }}
    >
      <span className="inline break-words text-center whitespace-normal">{displayedText}</span>
      <span
        className={`ml-1 inline-block h-[0.95em] w-[3px] rounded-full align-middle animate-pulse shadow-[0_0_14px_currentColor] ${cursorClassName}`}
        aria-hidden="true"
      />
    </span>
  );
}

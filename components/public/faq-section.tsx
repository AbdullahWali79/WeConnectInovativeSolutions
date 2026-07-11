"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/icon";

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "What is the criteria for transitioning into the Paid Internship stage?",
    answer: "Trainees qualify for the Paid Internship by consistently submitting assignments on time, achieving an average task score of 80% or above, demonstrating professional communication habits, and passing a milestone evaluation by their course mentor.",
  },
  {
    question: "Do I need a technical background or coding experience to apply?",
    answer: "No, prior coding experience is not required. Our 3-month pathway is structured starting from absolute fundamentals. We provide step-by-step guidance, mentor support, and structured tasks so anyone with dedication can learn.",
  },
  {
    question: "How are assignments reviewed, and what is the response time?",
    answer: "Every task you submit is thoroughly reviewed by an active industry professional. You receive a score out of 100 alongside actionable notes for improvement. Feedback is typically returned within 24 to 48 hours.",
  },
  {
    question: "Will I receive a certificate upon completion of the training?",
    answer: "Yes, graduation certificates are awarded to all trainees who complete the 12-week syllabus and maintain a passing grade. Successful internship graduates also receive professional experience letters from WeConnect.",
  },
  {
    question: "Is it possible to complete this program entirely online?",
    answer: "Yes, the entire program, including task submissions, review logging, progress tracking, and mentor discussions, is hosted completely online through this custom student training portal.",
  },
];

export function FAQSection() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaqs = faqData.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section className="relative overflow-hidden py-16 md:py-24 bg-gradient-to-b from-white to-[#F0F3FF]">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-1/2 left-1/2 -z-10 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-100/30 blur-[120px]" />
      
      <div className="homepage-wide-container">
        {/* Header */}
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="wc-section-label mb-4">
            <Icon name="help" className="text-sm" /> FAQ Accordion
          </div>
          <h2 className="text-3xl font-extrabold text-[#062B7F] sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-sm text-on-surface-variant sm:text-base">
            Find answers to commonly asked questions about our structured training pathway and internship portal.
          </p>

          {/* Search Box */}
          <div className="relative mt-8 max-w-md mx-auto">
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-[#DDE6F5] bg-white px-5 py-3.5 pl-12 text-sm shadow-sm transition-all focus:border-[#062B7F] focus:outline-none focus:ring-4 focus:ring-[#062B7F]/5"
            />
            <Icon
              name="search"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-[#5B6B88]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#062B7F]"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* FAQ List */}
        <div className="mx-auto max-w-3xl space-y-4">
          <AnimatePresence initial={false}>
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, idx) => {
                const isOpen = activeIndex === idx;
                return (
                  <motion.div
                    key={faq.question}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
                      isOpen
                        ? "border-[#062B7F]/30 bg-white shadow-md ring-4 ring-[#062B7F]/5"
                        : "border-[#DDE6F5] bg-white/70 backdrop-blur-md hover:border-[#062B7F]/20 hover:shadow-sm"
                    }`}
                  >
                    <button
                      onClick={() => setActiveIndex(isOpen ? null : idx)}
                      className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors sm:p-6"
                    >
                      <span className="text-base font-bold text-[#071A3B] sm:text-lg">
                        {faq.question}
                      </span>
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform duration-300 ${
                          isOpen
                            ? "bg-[#062B7F] text-white"
                            : "bg-[#EEF4FF] text-[#062B7F]"
                        }`}
                      >
                        <Icon
                          name="keyboard_arrow_down"
                          className={`text-xl transition-transform duration-350 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                        >
                          <div className="border-t border-[#DDE6F5]/50 px-5 pb-5 pt-4 text-sm leading-relaxed text-[#5B6B88] sm:px-6 sm:pb-6 sm:text-base">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center py-10 bg-white/50 backdrop-blur-sm rounded-2xl border border-dashed border-[#DDE6F5]">
                <Icon name="search_off" className="text-4xl text-[#5B6B88] mb-2" />
                <p className="text-sm font-semibold text-[#071A3B]">No questions found matching &quot;{searchQuery}&quot;</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

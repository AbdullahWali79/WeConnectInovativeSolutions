"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/icon";

type Message = { id: string; type: "user" | "bot"; text: string };
const suggestions = ["What services do you offer?", "Show me your products", "Which courses are available?", "How can I apply?", "How do I contact your team?"];

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ id: "welcome", type: "bot", text: "Hello! How can I guide you about WeConnect today?" }]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [assistantName, setAssistantName] = useState("WeConnect Assistant");
  const [aiEnabled, setAiEnabled] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);
  useEffect(() => {
    void fetch("/api/ai-assistant/chat", { cache: "no-store" }).then((response) => response.json()).then((config: { enabled?: boolean; assistantName?: string; welcomeMessage?: string }) => {
      setAiEnabled(Boolean(config.enabled));
      if (config.assistantName) setAssistantName(config.assistantName);
      if (config.welcomeMessage) setMessages([{ id: "welcome", type: "bot", text: config.welcomeMessage }]);
    }).catch(() => setAiEnabled(false));
  }, []);

  async function send(question: string) {
    const text = question.trim();
    if (!text || isTyping) return;
    const userMessage: Message = { id: crypto.randomUUID(), type: "user", text };
    const next = [...messages, userMessage];
    setMessages(next); setInputValue(""); setIsTyping(true);
    try {
      const response = await fetch("/api/ai-assistant/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next.map((message) => ({ role: message.type === "bot" ? "model" : "user", text: message.text })) }) });
      const payload = await response.json() as { answer?: string; error?: string; assistantName?: string };
      if (!response.ok || !payload.answer) throw new Error(payload.error ?? "The assistant could not answer right now.");
      if (payload.assistantName) setAssistantName(payload.assistantName);
      setAiEnabled(true);
      setMessages((current) => [...current, { id: crypto.randomUUID(), type: "bot", text: payload.answer! }]);
    } catch (error) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), type: "bot", text: error instanceof Error ? error.message : "The assistant is temporarily unavailable. Please use the Contact page." }]);
    } finally { setIsTyping(false); }
  }

  return <>
    <AnimatePresence>{!isOpen ? <motion.button initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} onClick={() => setIsOpen(true)} aria-label="Open AI assistant" className="public-chatbot-button fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full text-on-primary"><Icon name="smart_toy" className="text-3xl" /></motion.button> : null}</AnimatePresence>
    <AnimatePresence>{isOpen ? <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} className="public-chatbot-panel fixed bottom-6 right-6 z-50 flex h-[600px] max-h-[85vh] w-[390px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-[var(--wc-outline-variant)] bg-[var(--wc-bg)] shadow-2xl">
      <div className="flex items-center justify-between border-b border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] p-4"><div className="flex items-center gap-3"><div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[var(--wc-secondary)]/20 text-[var(--wc-secondary)]"><Icon name="smart_toy" /><span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white ${aiEnabled ? "bg-emerald-500" : "bg-amber-500"}`} /></div><div><h3 className="text-sm font-black text-on-surface">{assistantName}</h3><p className="text-[10px] font-bold uppercase tracking-widest text-[var(--wc-secondary)]">{aiEnabled ? "AI website guide" : "Guide mode"}</p></div></div><button onClick={() => setIsOpen(false)} aria-label="Close assistant" className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--wc-surface-low)]"><Icon name="close" /></button></div>
      <div className="flex-1 overflow-y-auto p-4"><div className="flex flex-col gap-4">{messages.map((message) => <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl p-3 text-sm leading-relaxed ${message.type === "user" ? "rounded-tr-sm bg-[var(--wc-secondary)] text-on-primary" : "rounded-tl-sm border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] text-on-surface"}`}>{message.text}</div></div>)}{isTyping ? <div className="flex justify-start"><div className="rounded-2xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] px-4 py-3 text-sm text-on-surface-variant">Thinking...</div></div> : null}{messages.length <= 2 && !isTyping ? <div className="flex flex-wrap gap-2">{suggestions.map((item) => <button key={item} onClick={() => void send(item)} className="rounded-lg border border-[var(--wc-secondary)]/30 px-3 py-2 text-left text-xs font-bold text-[var(--wc-secondary)] hover:bg-[var(--wc-secondary)]/10">{item}</button>)}</div> : null}<div ref={endRef} /></div></div>
      <form onSubmit={(event) => { event.preventDefault(); void send(inputValue); }} className="flex gap-2 border-t border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] p-3"><input value={inputValue} onChange={(event) => setInputValue(event.target.value)} maxLength={2000} placeholder="Ask about services, products, or courses..." className="min-w-0 flex-1 rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] px-4 py-2.5 text-sm text-on-surface outline-none focus:border-[var(--wc-secondary)]" /><button disabled={!inputValue.trim() || isTyping} aria-label="Send message" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--wc-secondary)] text-on-primary disabled:opacity-50"><Icon name="send" /></button></form>
    </motion.div> : null}</AnimatePresence>
  </>;
}
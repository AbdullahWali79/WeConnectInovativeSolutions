"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/icon";
import { useBranding } from "@/components/branding-provider";

type Message = { id: string; type: "user" | "bot"; text: string };
type ChatCta = { href: string; label: string; icon: string };
const suggestions = ["What services do you offer?", "Show me your products", "Which courses are available?", "How can I apply?", "How do I contact your team?"];
const faqs = [
  { question: "What services do you offer?", answer: "We build websites, web applications, automation solutions, and other digital products. Explore current work on /products." },
  { question: "How can I discuss a new project?", answer: "Share your requirements through /contact and the team can review the scope, timeline, and next steps." },
  { question: "How can I join a course?", answer: "View active courses on /courses, then submit your application through /apply." },
  { question: "Do you provide research consultancy?", answer: "Yes. Visit /research-consultancy for available academic research support and guidance." },
  { question: "Where can I see client feedback?", answer: "Approved client and student feedback is available on /testimonials." },
];

function getAnswerCtas(text: string): ChatCta[] {
  const value = text.toLowerCase();
  const actions: ChatCta[] = [];
  if (/\/contact|contact|quotation|quote|project requirements|discuss/.test(value)) actions.push({ href: "/contact", label: "Contact Team", icon: "contact_support" });
  if (/\/products|product|portfolio|previous work|our work/.test(value)) actions.push({ href: "/products", label: "View Products", icon: "inventory_2" });
  if (/\/courses|course|training/.test(value)) actions.push({ href: "/courses", label: "View Courses", icon: "school" });
  if (/\/apply|application|admission|join/.test(value)) actions.push({ href: "/apply", label: "Apply Now", icon: "send" });
  if (/research-consultancy|research support|thesis/.test(value)) actions.push({ href: "/research-consultancy", label: "Research Support", icon: "science" });
  return actions.filter((action, index, list) => list.findIndex((item) => item.href === action.href) === index).slice(0, 2);
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const branding = useBranding();
  const usingLogoPalette = branding.landingPalette === "logo";
  const [messages, setMessages] = useState<Message[]>([{ id: "welcome", type: "bot", text: "Hello! How can I guide you about WeConnect today?" }]);
  const [welcomeMessage, setWelcomeMessage] = useState("Hello! How can I guide you about WeConnect today?");
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
      if (config.welcomeMessage) { setWelcomeMessage(config.welcomeMessage); setMessages([{ id: "welcome", type: "bot", text: config.welcomeMessage }]); }
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

  function resetChat() {
    setMessages([{ id: "welcome", type: "bot", text: welcomeMessage }]);
    setInputValue("");
    setIsTyping(false);
  }

  return <>
    <AnimatePresence>{!isOpen && !faqOpen ? <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }} onMouseEnter={() => setToolsOpen(true)} onMouseLeave={() => setToolsOpen(false)} className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-2 pb-1">
      <AnimatePresence>{toolsOpen ? <>
        <motion.button initial={{ opacity: 0, y: 16, scale: 0.75 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.75 }} transition={{ delay: 0.08 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.94 }} type="button" onClick={() => { setToolsOpen(false); setIsOpen(true); }} aria-label="Open AI assistant" title="Ask AI" className="public-chatbot-button flex h-12 w-12 items-center justify-center rounded-full text-on-primary shadow-lg"><Icon name="smart_toy" className="text-2xl" /></motion.button>
        <motion.button initial={{ opacity: 0, y: 16, scale: 0.75 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.75 }} transition={{ delay: 0.04 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.94 }} type="button" onClick={() => { setToolsOpen(false); setFaqOpen(true); }} aria-label="Open frequently asked questions" title="Frequently asked questions" className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--wc-secondary)]/30 bg-[var(--wc-surface-lowest)] text-[var(--wc-secondary)] shadow-lg"><Icon name="help" className="text-2xl" /></motion.button>
        <motion.button initial={{ opacity: 0, y: 16, scale: 0.75 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.75 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.94 }} type="button" onClick={() => branding.setLandingPalette(usingLogoPalette ? "classic" : "logo")} aria-label={`Use ${usingLogoPalette ? "classic" : "logo"} color scheme`} title={`Use ${usingLogoPalette ? "classic" : "logo"} color scheme`} className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--wc-secondary)]/30 bg-[var(--wc-surface-lowest)] text-[var(--wc-secondary)] shadow-lg"><Icon name="palette" className="text-2xl" /></motion.button>
      </> : null}</AnimatePresence>
      <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} type="button" onClick={() => setToolsOpen((current) => !current)} aria-label={toolsOpen ? "Close quick actions" : "Open quick actions"} aria-expanded={toolsOpen} title="Quick actions" className="public-chatbot-button flex h-16 w-16 items-center justify-center rounded-full text-on-primary shadow-xl"><Icon name={toolsOpen ? "close" : "add"} className="text-3xl" /></motion.button>
    </motion.div> : null}</AnimatePresence>
    <AnimatePresence>{faqOpen ? <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} className="public-chatbot-panel fixed bottom-6 right-6 z-50 flex max-h-[85vh] w-[420px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-[var(--wc-outline-variant)] bg-[var(--wc-bg)] shadow-2xl">
      <div className="flex items-center justify-between border-b border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--wc-secondary)]/15 text-[var(--wc-secondary)]"><Icon name="help" /></div><div><h3 className="text-sm font-black text-on-surface">Frequently Asked Questions</h3><p className="text-[10px] font-bold uppercase tracking-widest text-[var(--wc-secondary)]">Quick platform guidance</p></div></div><button onClick={() => setFaqOpen(false)} aria-label="Close frequently asked questions" className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--wc-surface-low)]"><Icon name="close" /></button></div>
      <div className="space-y-3 overflow-y-auto p-4">{faqs.map((item) => <details key={item.question} className="group rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] p-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-black text-on-surface">{item.question}<Icon name="expand_more" className="transition-transform group-open:rotate-180" /></summary><p className="mt-3 text-sm leading-6 text-on-surface-variant">{item.answer}</p></details>)}</div>
      <div className="border-t border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] p-3"><button type="button" onClick={() => { setFaqOpen(false); setIsOpen(true); }} className="wc-primary-btn w-full justify-center"><Icon name="smart_toy" /> Ask AI for more help</button></div>
    </motion.div> : null}</AnimatePresence>    <AnimatePresence>{isOpen ? <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} className="public-chatbot-panel fixed bottom-6 right-6 z-50 flex h-[600px] max-h-[85vh] w-[390px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-[var(--wc-outline-variant)] bg-[var(--wc-bg)] shadow-2xl">
      <div className="flex items-center justify-between border-b border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] p-4"><div className="flex items-center gap-3"><div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[var(--wc-secondary)]/20 text-[var(--wc-secondary)]"><Icon name="smart_toy" /><span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white ${aiEnabled ? "bg-emerald-500" : "bg-amber-500"}`} /></div><div><h3 className="text-sm font-black text-on-surface">{assistantName}</h3><p className="text-[10px] font-bold uppercase tracking-widest text-[var(--wc-secondary)]">{aiEnabled ? "AI website guide" : "Guide mode"}</p></div></div><div className="flex items-center gap-1"><button type="button" onClick={resetChat} aria-label="Start a new chat" title="New chat" className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--wc-surface-low)] text-[var(--wc-secondary)]"><Icon name="restart_alt" /></button><button onClick={() => setIsOpen(false)} aria-label="Close assistant" className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--wc-surface-low)]"><Icon name="close" /></button></div></div>
      <div className="flex-1 overflow-y-auto p-4"><div className="flex flex-col gap-4">{messages.map((message, index) => { const isLatestAnswer = message.type === "bot" && message.id !== "welcome" && index === messages.length - 1 && !isTyping; const ctas = isLatestAnswer ? getAnswerCtas(message.text) : []; return <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] ${message.type === "user" ? "" : "space-y-3"}`}><div className={`whitespace-pre-wrap rounded-2xl p-3 text-sm leading-relaxed ${message.type === "user" ? "rounded-tr-sm bg-[var(--wc-secondary)] text-on-primary" : "rounded-tl-sm border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] text-on-surface"}`}>{message.text}</div>{isLatestAnswer ? <div className="flex flex-wrap gap-2">{ctas.map((action) => <a key={action.href} href={action.href} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--wc-secondary)] px-3 py-2 text-xs font-black text-on-primary"><Icon name={action.icon} className="text-base" />{action.label}</a>)}<button type="button" onClick={resetChat} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--wc-secondary)]/35 px-3 py-2 text-xs font-black text-[var(--wc-secondary)]"><Icon name="restart_alt" className="text-base" />Ask Another Question</button></div> : null}</div></div>; })}{isTyping ? <div className="flex justify-start"><div className="rounded-2xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] px-4 py-3 text-sm text-on-surface-variant">Thinking...</div></div> : null}{messages.length <= 2 && !isTyping ? <div className="flex flex-wrap gap-2">{suggestions.map((item) => <button key={item} onClick={() => void send(item)} className="rounded-lg border border-[var(--wc-secondary)]/30 px-3 py-2 text-left text-xs font-bold text-[var(--wc-secondary)] hover:bg-[var(--wc-secondary)]/10">{item}</button>)}</div> : null}<div ref={endRef} /></div></div>
      <form onSubmit={(event) => { event.preventDefault(); void send(inputValue); }} className="flex gap-2 border-t border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] p-3"><input value={inputValue} onChange={(event) => setInputValue(event.target.value)} maxLength={2000} placeholder="Ask about services, products, or courses..." className="min-w-0 flex-1 rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] px-4 py-2.5 text-sm text-on-surface outline-none focus:border-[var(--wc-secondary)]" /><button disabled={!inputValue.trim() || isTyping} aria-label="Send message" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--wc-secondary)] text-on-primary disabled:opacity-50"><Icon name="send" /></button></form>
    </motion.div> : null}</AnimatePresence>
  </>;
}

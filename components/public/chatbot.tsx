"use client";

import React, { useState, useEffect, useRef } from "react";
import { Icon } from "@/components/icon";
import { AnimatePresence, motion } from "framer-motion";

interface Message {
  id: string;
  type: "user" | "bot";
  text: string;
}

const predefinedFaqs = [
  {
    question: "What training programs do you offer?",
    answer: "We offer hands-on training in Full Stack Web Development (MERN), WordPress, Mobile App Development (Flutter), Digital Marketing, and AI Automation."
  },
  {
    question: "How long are the training pathways?",
    answer: "Our training pathways typically last between 3 to 6 months depending on the course you choose, focusing on practical assignments and mentor reviews."
  },
  {
    question: "Do you offer internships after training?",
    answer: "Yes! Successful trainees with high assessment scores are recommended for internships at our partner software houses based on their performance."
  },
  {
    question: "How can I apply?",
    answer: "You can apply by clicking the 'Apply Now' button in the header and filling out the registration form. Our team will contact you shortly."
  },
  {
    question: "Do I need prior experience?",
    answer: "No prior experience is required for most beginner pathways. We guide you from fundamentals to practical project work."
  },
  {
    question: "Is the training online or physical?",
    answer: "The training is primarily online and portal-based, with resources, tasks, and mentorship managed through the student portal."
  },
  {
    question: "What consultancy services do you offer?",
    answer: "We provide consultancy for web and mobile product development, business process automation, AI solutions, digital strategy, and technology planning."
  },
  {
    question: "How does the consultancy process work?",
    answer: "We begin with a discovery call to understand your goals and challenges. Our team then recommends a practical solution, project scope, timeline, and implementation plan."
  },
  {
    question: "Can you build a custom solution for my business?",
    answer: "Yes. We design and develop custom websites, applications, automation systems, and AI-powered tools based on your business requirements."
  },
  {
    question: "How much does consultancy cost?",
    answer: "The cost depends on the scope, complexity, and duration of your project. Contact our team with your requirements to receive a tailored estimate."
  },
  {
    question: "How can I book a consultation?",
    answer: "You can book a consultation through our Contact page or use the Start a Project button. Share a brief overview of your needs and our team will get in touch."
  },
  {
    question: "Will I get certificates?",
    answer: "Yes, after completing the required tasks and course progress, eligible students can receive completion support and certificates."
  },
  {
    question: "How do I check my tasks and progress?",
    answer: "After logging in, open the Student Portal to view assigned tasks, submissions, progress reports, and helpful learning resources."
  },
  {
    question: "Can I submit tasks again if my work needs changes?",
    answer: "Yes, if a task is marked for revision, you can resubmit the updated work from the task submission page."
  }
];

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-msg",
      type: "bot",
      text: "Hello! Welcome to WeConnect-Innovation. I am your virtual assistant. How can I help you today?"
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleFaqClick = (faq: { question: string, answer: string }) => {
    // Add user message
    const userMsg: Message = { id: Date.now().toString(), type: "user", text: faq.question };
    setMessages(prev => [...prev, userMsg]);

    // Simulate bot thinking
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const botMsg: Message = { id: (Date.now() + 1).toString(), type: "bot", text: faq.answer };
      setMessages(prev => [...prev, botMsg]);
    }, 800);
  };

  const [inputValue, setInputValue] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Add user message
    const userMsg: Message = { id: Date.now().toString(), type: "user", text: inputValue };
    setMessages(prev => [...prev, userMsg]);
    setInputValue("");

    // Simulate bot thinking
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        text: "Thanks for your message! Currently, I am operating on predefined FAQs. An AI update is coming soon to answer all your custom questions. Meanwhile, feel free to use the FAQ buttons above or contact our team!"
      };
      setMessages(prev => [...prev, botMsg]);
    }, 1000);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="public-chatbot-button fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full text-on-primary transition-all"
          >
            <Icon name="chat" className="text-3xl" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="public-chatbot-panel fixed bottom-6 right-6 z-50 flex h-[600px] max-h-[85vh] w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-3xl border border-[var(--wc-outline-variant)] bg-[var(--wc-bg)] shadow-[0_0_50px_rgba(0,0,0,0.8)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] p-4 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[var(--wc-secondary)]/20 text-[var(--wc-secondary)] border border-[var(--wc-secondary)]/50">
                  <Icon name="smart_toy" className="text-xl" />
                  <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-[var(--wc-surface-lowest)]"></span>
                </div>
                <div>
                  <h3 className="font-black text-on-surface text-sm">WeConnect Assistant</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--wc-secondary)]">Online</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--wc-surface-low)] text-[var(--wc-on-surface-variant)] transition-colors hover:bg-[var(--wc-secondary)] hover:text-on-primary"
              >
                <Icon name="close" className="text-lg" />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--wc-surface-low)] relative">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,43,127,0.15),transparent)] pointer-events-none" />

              <div className="flex flex-col gap-4 relative z-10">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex w-full ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${
                      msg.type === "user"
                        ? "bg-[var(--wc-secondary)] text-on-primary rounded-tr-sm font-semibold"
                        : "bg-[var(--wc-surface-low)] text-on-surface rounded-tl-sm border border-[var(--wc-outline-variant)]"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex w-full justify-start">
                    <div className="bg-[var(--wc-surface-low)] rounded-2xl rounded-tl-sm p-4 border border-[var(--wc-outline-variant)] flex gap-1.5 items-center">
                      <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 bg-[var(--wc-on-surface-variant)] rounded-full" />
                      <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-[var(--wc-on-surface-variant)] rounded-full" />
                      <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-[var(--wc-on-surface-variant)] rounded-full" />
                    </div>
                  </div>
                )}

                {/* Predefined FAQs options (only show if latest message is not from user waiting) */}
                {!isTyping && messages[messages.length - 1].type === "bot" && (
                  <div className="mt-2 flex flex-col gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#5B6B88] mb-1">Suggested Questions</p>
                    {predefinedFaqs.map((faq, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleFaqClick(faq)}
                        className="text-left rounded-xl border border-[var(--wc-secondary)]/30 bg-[var(--wc-secondary)]/5 px-3 py-2.5 text-xs font-semibold text-[var(--wc-secondary)] transition-colors hover:bg-[var(--wc-secondary)]/20"
                      >
                        {faq.question}
                      </button>
                    ))}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="border-t border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)]/80 p-3 backdrop-blur-md">
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-xl bg-[var(--wc-surface-low)] border border-[var(--wc-outline-variant)] px-4 py-2.5 text-sm text-on-surface placeholder-[#5B6B88] focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)]"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--wc-secondary)] text-on-primary transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Icon name="send" className="text-[18px]" />
                </button>
              </form>
              <div className="mt-2 text-center text-[9px] font-bold uppercase tracking-widest text-[#5B6B88]">
                AI Integration Coming Soon
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

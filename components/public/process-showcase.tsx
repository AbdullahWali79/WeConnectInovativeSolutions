"use client";

import { motion } from "framer-motion";
import { Icon } from "@/components/icon";

const processSteps = [
  { icon: "forum", step: "01", eyebrow: "Discover", title: "Consultation & Scope", desc: "We understand your vision, audience, and technical requirements, then turn them into a precise project scope.", color: "#F59E0B", tint: "#FFF7E6" },
  { icon: "draw", step: "02", eyebrow: "Shape", title: "Design & Prototype", desc: "Our UI/UX team creates an interactive prototype so you can see and validate the complete experience early.", color: "#2563EB", tint: "#EEF4FF" },
  { icon: "rocket_launch", step: "03", eyebrow: "Deliver", title: "Develop & Launch", desc: "We build with a scalable stack, test every critical flow, and deploy your finished product to production.", color: "#159A6C", tint: "#EAF9F3" },
] as const;

export function ProcessShowcase() {
  return (
    <div className="relative pb-2 md:pb-12">
      <div className="absolute bottom-12 left-8 top-12 w-px bg-[#DCE4F0] md:hidden" />
      <div className="grid gap-4 md:grid-cols-3 md:gap-7 lg:gap-10">
        {processSteps.map((feature, index) => (
          <motion.article
            key={feature.step}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.6, delay: index * 0.16, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: index * 30 - 7, scale: 1.015 }}
            className="group relative ml-4 rounded-lg border border-[#DCE4F0] bg-white p-5 shadow-[0_12px_35px_rgba(7,26,59,0.07)] md:ml-0 md:p-6"
            style={{
              borderLeftColor: feature.color,
              borderLeftWidth: 3,
              y: index * 30,
            }}
          >
            <div className="absolute -left-4 top-8 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white text-[11px] font-extrabold text-white shadow-sm md:hidden" style={{ backgroundColor: feature.color }}>
              {feature.step}
            </div>

            {index < processSteps.length - 1 ? (
              <motion.div
                className="absolute -right-[31px] top-1/2 z-10 hidden h-8 w-8 items-center justify-center rounded-full border border-[#DCE4F0] bg-white text-[#7183A3] shadow-sm md:flex lg:-right-[38px]"
                animate={{ x: [0, 3, 0], y: [0, 3, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, delay: index * 0.35, ease: "easeInOut" }}
              >
                <Icon name="arrow_downward" className="rotate-[-45deg] text-[17px]" />
              </motion.div>
            ) : null}

            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110" style={{ backgroundColor: feature.tint, color: feature.color }}>
                <Icon name={feature.icon} className="text-[25px]" />
              </div>
              <span className="text-4xl font-black leading-none text-[#E9EEF6]">{feature.step}</span>
            </div>

            <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em]" style={{ color: feature.color }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: feature.color }} />
              {feature.eyebrow}
            </div>
            <h3 className="mb-2 text-xl font-extrabold text-[#071A3B]">{feature.title}</h3>
            <p className="text-sm leading-6 text-[#5B6B88]">{feature.desc}</p>
          </motion.article>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/icon";

type ProcessStep = {
  icon: string;
  step: string;
  title: string;
  desc: string;
  accentStart: string;
  accentEnd: string;
};

const processSteps: ProcessStep[] = [
  {
    icon: "chat",
    step: "01",
    title: "Consultation & Scope",
    desc: "We sit down with you to understand your vision, target audience, and technical requirements to draft a precise scope.",
    accentStart: "#FFD24A",
    accentEnd: "#FFA03A",
  },
  {
    icon: "design_services",
    step: "02",
    title: "Design & Prototype",
    desc: "Our UI/UX team creates interactive prototypes. You get a clear picture of exactly how your product will look and feel.",
    accentStart: "#4379FF",
    accentEnd: "#062B7F",
  },
  {
    icon: "rocket_launch",
    step: "03",
    title: "Develop & Launch",
    desc: "Our engineering team builds your product using modern, scalable tech stacks. We rigorously test and deploy to production.",
    accentStart: "#38C189",
    accentEnd: "#1E8A5E",
  },
];

export function ProcessShowcase() {
  const [activeStep, setActiveStep] = useState(0);
  const [transitionTick, setTransitionTick] = useState(0);

  const positions = useMemo(() => ["18%", "50%", "82%"], []);
  const activeAccent = processSteps[activeStep] ?? processSteps[0];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveStep((current) => (current + 1) % processSteps.length);
    }, 2000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setTransitionTick((value) => value + 1);
  }, [activeStep]);

  return (
    <div className="relative">
      <div className="mb-10 md:hidden">
        <div className="mb-4 flex items-center justify-between text-xs font-bold uppercase tracking-[0.22em] text-[#91A3C7]">
          <motion.span
            key={`mobile-step-${activeStep}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            Step {processSteps[activeStep].step}
          </motion.span>
          <motion.span
            key={`mobile-title-${activeStep}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            {processSteps[activeStep].title}
          </motion.span>
        </div>

        <div className="relative h-2 overflow-hidden rounded-full bg-[#E7EDF7]">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${((activeStep + 1) / processSteps.length) * 100}%`,
              backgroundImage: `linear-gradient(90deg, ${activeAccent.accentStart}, ${activeAccent.accentEnd})`,
            }}
            animate={{ width: `${((activeStep + 1) / processSteps.length) * 100}%` }}
            transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
          />
          <div
            className="absolute inset-y-0 left-0 w-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.65),transparent)] animate-gradient-x opacity-40"
          />
          <motion.div
            className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_22px_rgba(255,210,74,0.75)]"
            style={{
              left: `calc(${((activeStep + 1) / processSteps.length) * 100}% - 8px)`,
              backgroundImage: `linear-gradient(135deg, ${activeAccent.accentStart}, ${activeAccent.accentEnd})`,
            }}
            animate={{ left: `calc(${((activeStep + 1) / processSteps.length) * 100}% - 8px)` }}
            transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
          />
          <div
            className="absolute top-1/2 h-5 -translate-y-1/2 rounded-full blur-md opacity-80 transition-all duration-700 ease-out"
            style={{
              width: `${Math.max(((activeStep + 1) / processSteps.length) * 100, 24)}%`,
              backgroundImage: `linear-gradient(90deg, transparent, ${activeAccent.accentStart}AA, ${activeAccent.accentEnd}CC, transparent)`,
            }}
          />
        </div>
      </div>

      <div className="absolute left-[15%] top-10 hidden h-[2px] w-[70%] overflow-hidden rounded-full bg-[#E7EDF7] md:block lg:w-[70%] xl:w-[60%] xl:left-[20%]">
        <motion.div
          className="absolute inset-y-0 left-0"
          style={{
            width: positions[activeStep],
            backgroundImage: `linear-gradient(90deg, ${activeAccent.accentStart}, ${activeAccent.accentEnd})`,
          }}
          animate={{ width: positions[activeStep] }}
          transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.div
          className="absolute inset-y-0 h-[10px] w-[120px] -translate-y-1/2 rounded-full blur-md"
          style={{
            left: `calc(${positions[activeStep]} - 60px)`,
            backgroundImage: `linear-gradient(90deg, transparent, ${activeAccent.accentStart}AA, ${activeAccent.accentEnd}CC, transparent)`,
          }}
          animate={{ left: `calc(${positions[activeStep]} - 60px)` }}
          transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
        />
        <div className="absolute inset-y-0 left-0 w-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.65),transparent)] animate-gradient-x opacity-40" />
        <motion.div
          className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_22px_rgba(255,210,74,0.75)]"
          style={{
            left: `calc(${positions[activeStep]} - 8px)`,
            backgroundImage: `linear-gradient(135deg, ${activeAccent.accentStart}, ${activeAccent.accentEnd})`,
          }}
          animate={{ left: `calc(${positions[activeStep]} - 8px)` }}
          transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.div
          className="absolute inset-y-0 h-[10px] w-[120px] -translate-y-1/2 rounded-full blur-md"
          style={{
            left: `calc(${positions[activeStep]} - 60px)`,
            backgroundImage: `linear-gradient(90deg, transparent, ${activeAccent.accentStart}AA, ${activeAccent.accentEnd}CC, transparent)`,
          }}
          animate={{ left: `calc(${positions[activeStep]} - 60px)` }}
          transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <div className="relative z-10 grid gap-16 md:grid-cols-3 md:gap-8">
        {processSteps.map((feature, index) => {
          const isActive = index === activeStep;
          const isComplete = index < activeStep;
          const isPending = index > activeStep;
          const cardDelay = isActive ? 0.08 : isComplete ? 0.14 : 0.2;
          return (
            <motion.div
              key={feature.step}
              className={`group relative flex flex-col items-center text-center transition-all duration-500 ${
                isActive
                  ? "-translate-y-3 scale-[1.06] md:-translate-y-4 md:scale-[1.08]"
                  : isComplete
                    ? "opacity-50 blur-[0.35px] saturate-75"
                    : "opacity-80"
              }`}
              animate={
                isActive
                  ? { rotateX: 6, rotateY: -8, y: -16, scale: 1.085 }
                  : { rotateX: 0, rotateY: 0, y: 0, scale: isComplete ? 0.975 : 1 }
              }
              transition={{ type: "spring", stiffness: 110, damping: 18, mass: 0.9 }}
              style={{ transformStyle: "preserve-3d", perspective: 1000 }}
            >
              {isActive ? (
                <motion.div
                  className="absolute -top-3 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-[#FFD24A]/10 blur-3xl pointer-events-none"
                  animate={{ scale: [1, 1.12, 1], opacity: [0.65, 1, 0.65] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              ) : null}

              <div className="absolute -top-16 left-1/2 -translate-x-1/2 text-[120px] font-black leading-none opacity-5 text-[#071A3B] pointer-events-none transition-opacity duration-500 group-hover:opacity-10">
                {feature.step}
              </div>

              <motion.div
                className={`mb-8 flex h-24 w-24 items-center justify-center rounded-3xl text-white shadow-[0_10px_30px_rgba(0,0,0,0.12)] transition-all duration-500 ${
                  isActive ? "animate-pulse ring-4 ring-[#FFD24A]/15" : ""
                }`}
                style={{
                  backgroundImage: `linear-gradient(135deg, ${feature.accentStart}, ${feature.accentEnd})`,
                }}
                whileHover={{ y: -10, rotate: isActive ? -4 : 0, scale: 1.1 }}
                animate={isActive ? { y: -2, rotate: -2, scale: 1.025 } : { y: 0, rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 180, damping: 16, mass: 0.7 }}
              >
                <Icon name={feature.icon} className="text-4xl drop-shadow-md" />
              </motion.div>

              <div className="mb-4 h-[3px] w-16 overflow-hidden rounded-full bg-[#E7EDF7]">
                <div
                  className={`h-full w-full origin-left rounded-full transition-transform duration-500 ${isActive || isComplete ? "scale-x-100" : "scale-x-0"}`}
                  style={{ backgroundImage: `linear-gradient(90deg, ${feature.accentStart}, ${feature.accentEnd})` }}
                />
              </div>

              <motion.div
                key={`content-${feature.step}-${transitionTick}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: cardDelay, ease: [0.16, 1, 0.3, 1] }}
                className="w-full"
              >
                <h3 className="mb-4 text-2xl font-extrabold text-[#071A3B] transition-colors group-hover:text-[#062B7F]">{feature.title}</h3>
                <p className="max-w-sm px-4 text-base leading-relaxed text-[#5B6B88]">{feature.desc}</p>
              </motion.div>

              <motion.div
                key={`step-label-${feature.step}-${activeStep}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: cardDelay + 0.08, ease: [0.16, 1, 0.3, 1] }}
                className={`mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] transition-colors ${isActive ? "text-[#062B7F]" : isPending ? "text-[#AFC0DD]" : "text-[#91A3C7]"}`}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundImage: `linear-gradient(135deg, ${feature.accentStart}, ${feature.accentEnd})` }} />
                Step {feature.step}
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

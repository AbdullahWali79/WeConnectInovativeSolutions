import React from "react";
import { Icon } from "@/components/icon";

export function TrainingJourney() {
  return (
    <section className="w-full bg-transparent" aria-label="training-journey">
      <div className="w-screen -translate-x-1/2 left-1/2 relative">
        <div className="mx-auto w-full glass-card-full overflow-hidden">
          <div className="flex flex-col lg:flex-row items-stretch w-full">
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-step step-1 hover-lift">
              <div className="mb-4 text-navy-icon bg-slate-100/50 p-4 rounded-2xl">
                <Icon name="school" className="text-4xl" />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-slate-400 font-medium text-xs uppercase tracking-[0.3em] mb-1">Training</span>
                <span className="text-navy-premium font-extrabold text-2xl uppercase tracking-tighter leading-none">Program</span>
              </div>
            </div>

            <div className="flex items-center justify-center px-4 py-6 lg:py-0 bg-slate-50/10 lg:bg-transparent animate-step trans-1">
              <div className="flex flex-col items-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] leading-none">
                <span className="mb-2">Leading</span>
                <div className="flex items-center justify-center">
                  <span className="hidden lg:flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                    <div className="w-12 h-[2px] bg-gradient-to-r from-slate-200 to-slate-400" />
                    <Icon name="arrow_forward_ios" className="text-sm animate-arrow" />
                  </span>
                </div>
                <span className="mt-2">To</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-t lg:border-t-0 lg:border-l border-white/10 animate-step step-2 hover-lift">
              <div className="mb-4 text-blue-600/80 bg-blue-50/50 p-4 rounded-2xl">
                <Icon name="verified_user" className="text-4xl" />
              </div>
              <span className="text-slate-800 font-bold text-lg tracking-tight">Internship</span>
            </div>

            <div className="flex items-center justify-center text-slate-300 animate-step trans-2">
              <Icon name="arrow_forward_ios" className="hidden lg:block animate-arrow" />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-t lg:border-t-0 lg:border-l border-white/10 animate-step step-3 hover-lift">
              <div className="mb-4 text-emerald-600/80 bg-emerald-50/50 p-4 rounded-2xl">
                <Icon name="account_balance_wallet" className="text-4xl" />
              </div>
              <span className="text-slate-800 font-bold text-lg tracking-tight">Paid Internship</span>
            </div>

            <div className="flex items-center justify-center text-slate-300 animate-step trans-3">
              <Icon name="arrow_forward_ios" className="hidden lg:block animate-arrow" />
            </div>

            <div className="flex-[1.3] flex flex-col items-center justify-center p-8 bg-navy-premium text-white relative group animate-step step-4">
              <div className="absolute inset-0 bg-blue-500/8 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="mb-4 text-blue-400 relative z-10">
                <Icon name="task_alt" className="text-5xl" />
              </div>
              <div className="flex flex-col items-center text-center relative z-10">
                <span className="text-3xl font-extrabold tracking-tighter mb-1">Job 99%</span>
                <span className="text-xs font-bold uppercase tracking-[0.4em] text-blue-300/80">Guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center mt-6 space-y-3">
        <div className="h-12 w-[1px] bg-gradient-to-b from-transparent to-slate-300" />
        <p className="text-center text-slate-400 text-[10px] uppercase tracking-[0.5em] font-bold">Your Career Growth Roadmap</p>
      </div>
    </section>
  );
}

export default TrainingJourney;

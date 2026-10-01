"use client";

import { useState } from "react";
import { Toast, type ToastState } from "@/components/toast";

export function AccountsManager() {
  const [toast, setToast] = useState<ToastState>(null);
  
  // Modals state
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isSharedAccountsModalOpen, setIsSharedAccountsModalOpen] = useState(false);
  const [isAddSellerModalOpen, setIsAddSellerModalOpen] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <Toast toast={toast} onClear={() => setToast(null)} />
      
      {/* Header section matching the screenshot */}
      <div className="bg-[#1e2330] rounded-xl p-6 border border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Accounts Workspace</h1>
          <p className="text-sm text-gray-400">Accounts aur clients popup me add karein. Neeche records clean layout me milenge.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setIsAddAccountModalOpen(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <span className="material-symbols-outlined text-[18px]">key</span>
            Add Shared Account
          </button>
          <button onClick={() => setIsAddClientModalOpen(true)} className="px-4 py-2 border border-gray-600 hover:bg-gray-800 text-gray-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Add Client
          </button>
          <button onClick={() => setIsSharedAccountsModalOpen(true)} className="px-4 py-2 border border-gray-600 hover:bg-gray-800 text-gray-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Shared Accounts
          </button>
          <button onClick={() => setIsAddSellerModalOpen(true)} className="px-4 py-2 border border-emerald-900/50 text-emerald-500 hover:bg-emerald-900/30 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <span className="material-symbols-outlined text-[18px]">sell</span>
            Add Seller
          </button>
        </div>
      </div>
      
      <div className="flex">
         <button className="px-4 py-2 border border-gray-600 hover:bg-gray-800 text-gray-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <span className="material-symbols-outlined text-[18px]">upload</span>
            Import Contacts
          </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1e2330] rounded-xl p-5 border border-gray-800">
          <p className="text-xs font-bold text-gray-400 tracking-wider mb-2">ALL ACCOUNTS</p>
          <p className="text-3xl font-bold text-white">46</p>
        </div>
        <div className="bg-[#1e2330] rounded-xl p-5 border border-gray-800">
          <p className="text-xs font-bold text-gray-400 tracking-wider mb-2">ACTIVE</p>
          <p className="text-3xl font-bold text-emerald-500">12</p>
        </div>
        <div className="bg-[#1e2330] rounded-xl p-5 border border-gray-800">
          <p className="text-xs font-bold text-gray-400 tracking-wider mb-2">EXPIRING SOON</p>
          <p className="text-3xl font-bold text-yellow-500">1</p>
        </div>
        <div className="bg-[#1e2330] rounded-xl p-5 border border-gray-800">
          <p className="text-xs font-bold text-gray-400 tracking-wider mb-2">EXPIRED</p>
          <p className="text-3xl font-bold text-red-400">32</p>
        </div>
      </div>
      
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="text-xs font-semibold text-gray-400 mb-1 block">Search Accounts</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-500 text-[20px]">search</span>
            <input 
              type="text" 
              placeholder="Search tool, login, plan, or client" 
              className="w-full bg-[#1e2330] border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div className="w-full md:w-48">
          <label className="text-xs font-semibold text-gray-400 mb-1 block">Status</label>
          <select className="w-full bg-[#1e2330] border border-gray-700 rounded-lg py-2.5 px-4 text-white text-sm focus:outline-none focus:border-blue-500">
            <option>Latest</option>
            <option>Oldest</option>
          </select>
        </div>
        <div className="w-full md:w-48">
          <label className="text-xs font-semibold text-gray-400 mb-1 block">Tool Filter</label>
          <select className="w-full bg-[#1e2330] border border-gray-700 rounded-lg py-2.5 px-4 text-white text-sm focus:outline-none focus:border-blue-500">
            <option>All tools</option>
            <option>ChatGPT</option>
            <option>Canva</option>
          </select>
        </div>
      </div>
      
      {/* Accounts List (Mockup for now) */}
      <div className="space-y-3">
        {/* Placeholder item */}
        <div className="bg-[#1e2330] border border-gray-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-white font-bold text-sm">ChatGPT • abdullahwali79@gmail.com</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-900/30 text-emerald-500 border border-emerald-800/50">ACTIVE</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-gray-800 text-gray-400 border border-gray-700">shared</span>
              <span className="text-xs text-emerald-500 font-medium">25 day(s) left</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-800 text-gray-300 border border-gray-700">6 client(s)</span>
           </div>
           <div className="flex gap-2">
             <button className="px-3 py-1.5 border border-gray-700 rounded-lg text-xs text-gray-300 hover:bg-gray-800 flex items-center gap-1">
               Expand <span className="material-symbols-outlined text-[16px]">expand_more</span>
             </button>
             <button className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800">
               <span className="material-symbols-outlined text-[18px]">edit</span>
             </button>
             <button className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-900/30">
               <span className="material-symbols-outlined text-[18px]">delete</span>
             </button>
           </div>
        </div>
      </div>
      
      {/* Modals will go here */}
      
    </div>
  );
}

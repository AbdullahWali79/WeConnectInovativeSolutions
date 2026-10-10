const fs = require('fs');
let c = fs.readFileSync('components/admin/personal-prompts/personal-prompts.tsx', 'utf8');

const replacements = [
  // Page container
  ['bg-[#0d1117]', 'bg-gray-50'], // just in case
  
  // Banner
  ['className="bg-[#1e2330] rounded-xl p-6 border border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"', 'className="rounded-xl bg-primary p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"'],
  ['<h1 className="text-xl font-bold text-white mb-1">My Personal Prompts</h1>', '<h1 className="text-xl font-bold text-white mb-1">My Personal Prompts</h1>'],
  ['<p className="text-sm text-gray-400">Save and organize your frequently used AI prompts.</p>', '<p className="text-sm text-blue-100">Save and organize your frequently used AI prompts.</p>'],
  ['className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition"', 'className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-blue-50 flex items-center gap-2"'],

  // Filters
  ['className="text-xs font-bold text-gray-400 mb-1 block"', 'className="text-xs font-bold text-gray-700 mb-1 block"'],
  ['className="w-full bg-[#1e2330] border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-blue-500"', 'className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-10 pr-4 text-gray-900 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"'],
  ['className="w-full bg-[#1e2330] border border-gray-700 rounded-lg py-2.5 px-4 text-white text-sm focus:outline-none focus:border-blue-500"', 'className="w-full bg-white border border-gray-300 rounded-lg py-2.5 px-4 text-gray-900 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"'],

  // Empty state
  ['className="col-span-full text-center py-10 text-gray-500 bg-[#1e2330] rounded-xl border border-gray-800"', 'className="col-span-full text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-200 shadow-sm"'],

  // Card
  ['className="bg-[#1e2330] border border-gray-800 rounded-xl p-5 flex flex-col relative"', 'className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col relative shadow-sm hover:shadow transition"'],
  ['className="text-lg font-bold text-white mb-2 leading-tight pr-8"', 'className="text-lg font-bold text-gray-900 mb-2 leading-tight pr-8"'],
  ['className="absolute top-4 right-4 text-gray-500 hover:text-white p-1"', 'className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 p-1 transition-colors"'],
  ['className="absolute top-4 right-12 text-gray-500 hover:text-red-400 p-1"', 'className="absolute top-4 right-12 text-gray-400 hover:text-red-600 p-1 transition-colors"'],
  ['className="px-2 py-0.5 rounded text-xs font-bold bg-[#151923] text-gray-400 border border-gray-800"', 'className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-primary"'],
  ['className="bg-[#151923] border border-gray-800 rounded-lg p-3"', 'className="bg-gray-50 border border-gray-100 rounded-lg p-3"'],
  ['className="text-xs font-bold text-gray-500 mb-1 flex justify-between items-center"', 'className="text-xs font-bold text-gray-500 mb-1 flex justify-between items-center"'],
  ['className="text-gray-400 hover:text-white"', 'className="text-gray-400 hover:text-primary transition-colors"'],
  ['className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed"', 'className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed"'],
  ['className="flex justify-between items-center pt-3 border-t border-gray-800 mt-auto"', 'className="flex justify-between items-center pt-3 border-t border-gray-100 mt-auto"'],
  ['className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-500 bg-emerald-900/20 hover:bg-emerald-900/40 flex items-center gap-1"', 'className="px-3 py-1.5 rounded-lg text-xs font-bold text-primary bg-blue-50 hover:bg-blue-100 flex items-center gap-1 transition-colors"'],
  ['className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-400 hover:text-white flex items-center gap-1"', 'className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors"'],

  // Modal Header
  ['className="bg-[#1e2330] border border-gray-700 rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"', 'className="w-full max-w-3xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl flex flex-col max-h-[90vh]"'],
  ['className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#151923]"', 'className="flex justify-between items-center border-b border-gray-200 bg-blue-50 p-4"'],
  ['className="w-8 h-8 rounded-full bg-emerald-900/30 flex items-center justify-center text-emerald-500"', 'className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700"'],
  ['className="text-white font-bold text-lg leading-tight"', 'className="text-lg font-bold leading-tight text-gray-900"'],
  ['className="text-xs text-gray-400"', 'className="text-xs text-gray-500"'],
  ['className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"', 'className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"'],

  // Modal Body
  ['className="text-xs font-bold text-gray-300 block mb-1"', 'className="mb-1 block text-xs font-bold text-gray-600"'],
  ['className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 outline-none"', 'className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100"'],
  ['className="text-[10px] text-gray-500 mt-1"', 'className="text-xs text-gray-500 mt-1"'],
  ['className="rounded bg-[#151923] border-gray-700 text-emerald-500 focus:ring-emerald-500"', 'className="rounded bg-white border-gray-300 text-primary focus:ring-primary"'],
  ['className="text-sm text-gray-300 font-bold"', 'className="text-sm font-bold text-gray-700"'],

  // Modal Prompt Texts section
  ['className="pt-4 border-t border-gray-800"', 'className="pt-4 border-t border-gray-200"'],
  ['className="text-sm font-bold text-white leading-tight"', 'className="text-sm font-bold text-gray-900 leading-tight"'],
  ['className="text-[10px] text-gray-500"', 'className="text-xs text-gray-500"'],
  ['className="px-3 py-1.5 border border-gray-600 hover:bg-gray-800 text-gray-300 rounded-lg text-xs font-bold flex items-center gap-1"', 'className="px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"'],
  ['className="bg-[#151923] border border-gray-800 rounded-xl p-4 relative"', 'className="bg-gray-50 border border-gray-200 rounded-xl p-4 relative"'],
  ['className="absolute top-2 right-2 p-1 text-gray-500 hover:text-red-400"', 'className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600 transition-colors"'],
  ['className="text-xs font-bold text-gray-400 mb-2"', 'className="mb-1 block text-xs font-bold text-gray-600"'],
  ['className="w-full bg-[#1e2330] border border-gray-700 rounded-lg p-3 text-gray-300 text-sm focus:border-emerald-500 outline-none mb-3 resize-none"', 'className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100 mb-3 resize-none"'],
  ['className="text-xs font-bold text-gray-400 block mb-1"', 'className="mb-1 block text-xs font-bold text-gray-600"'],
  ['className="w-full bg-[#1e2330] border border-gray-700 rounded-lg p-2.5 text-gray-300 text-sm focus:border-emerald-500 outline-none"', 'className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100"'],

  // Modal Footer
  ['className="p-4 border-t border-gray-800 bg-[#151923] flex gap-3"', 'className="flex gap-3 border-t border-gray-200 bg-gray-50 p-4"'],
  ['className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm flex items-center gap-2"', 'className="rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-800 flex items-center gap-2"'],
  ['className="px-5 py-2.5 border border-gray-600 hover:bg-gray-800 text-gray-300 font-bold rounded-lg text-sm flex items-center gap-2"', 'className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 flex items-center gap-2"'],

  // The container
  ['<div className="p-6 space-y-6 max-w-7xl mx-auto text-white">', '<div className="p-6 space-y-6 max-w-7xl mx-auto">']
];

for (const [oldStr, newStr] of replacements) {
  c = c.split(oldStr).join(newStr);
}

fs.writeFileSync('components/admin/personal-prompts/personal-prompts.tsx', c);

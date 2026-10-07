const fs = require('fs');
let c = fs.readFileSync('components/admin/accounts-manager/accounts-manager.tsx', 'utf8');

const lockScreen = `  if (!unlocked) return (
    <div className="flex h-[80vh] flex-col items-center justify-center p-4">
      <div className="bg-surface-container border border-white/10 p-8 rounded-2xl w-full max-w-sm text-center shadow-xl">
        <h2 className="text-xl font-bold text-white mb-2">Accounts Manager Locked</h2>
        <p className="text-sm text-gray-400 mb-6">Enter password to unlock this module</p>
        <input 
          type="password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          onKeyDown={e => {
            if (e.key === 'Enter') {
              if (password === 'Abdullah123@') setUnlocked(true);
              else alert('Incorrect password');
            }
          }}
          placeholder="Password" 
          className="w-full bg-[#0d1117] border border-white/20 rounded-lg px-4 py-3 text-white mb-4 outline-none focus:border-primary" 
        />
        <button 
          onClick={() => {
            if (password === 'Abdullah123@') setUnlocked(true);
            else alert('Incorrect password');
          }}
          className="w-full bg-primary text-white font-bold py-3 rounded-lg transition"
        >
          Unlock Module
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">`;

c = c.replace('  return (\n    <div className="p-6 space-y-6">', lockScreen);
fs.writeFileSync('components/admin/accounts-manager/accounts-manager.tsx', c);

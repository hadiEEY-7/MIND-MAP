
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { X, User, MapPin, Copy, Check, Camera, RefreshCw } from 'lucide-react';

interface ProfileModalProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onClose: () => void;
}

const AVATAR_SEEDS = ['Felix', 'Aneka', 'Zack', 'Midnight', 'Lilac', 'Sky', 'Bandit', 'Misty'];
const REGIONS = ['North America', 'Europe', 'Asia', 'South America', 'Africa', 'Oceania', 'Global'];

export const ProfileModal: React.FC<ProfileModalProps> = ({ profile, onSave, onClose }) => {
  const [name, setName] = useState(profile.name);
  const [region, setRegion] = useState(profile.region);
  const [avatarSeed, setAvatarSeed] = useState(profile.avatar.includes('seed=') ? profile.avatar.split('seed=')[1] : 'Felix');
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(profile.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onSave({
      ...profile,
      name,
      region,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <User className="text-indigo-400" size={24} /> Edit Profile
          </h2>
          <button 
            onClick={onClose} 
            className="text-slate-500 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Unique ID Card */}
          <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-indigo-300 font-medium uppercase tracking-wider mb-1">Your Unique Friend ID</p>
              <p className="text-xl font-mono font-bold text-white tracking-wider">{profile.id}</p>
            </div>
            <button 
              onClick={handleCopyId}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          {/* Avatar Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Choose Avatar</label>
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full border-4 border-indigo-500 bg-slate-800 mb-4 relative overflow-hidden shadow-lg shadow-indigo-900/50">
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`} 
                  alt="Avatar Preview" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="grid grid-cols-4 gap-3 w-full">
                {AVATAR_SEEDS.map((seed) => (
                  <button
                    key={seed}
                    onClick={() => setAvatarSeed(seed)}
                    className={`rounded-xl p-1 border-2 transition-all ${avatarSeed === seed ? 'border-indigo-500 bg-indigo-500/20' : 'border-slate-700 hover:border-slate-500 bg-slate-800'}`}
                  >
                    <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} 
                      alt={seed} 
                      className="w-full h-auto rounded-lg"
                    />
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setAvatarSeed(Math.random().toString(36).substring(7))}
                className="mt-4 text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <RefreshCw size={12} /> Generate Random
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Display Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Region</label>
              <div className="relative">
                <select 
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none cursor-pointer"
                >
                  {REGIONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors font-medium shadow-lg shadow-indigo-900/20"
          >
            Save Profile
          </button>
        </div>

      </div>
    </div>
  );
};

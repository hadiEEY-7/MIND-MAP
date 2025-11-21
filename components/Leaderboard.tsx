
import React, { useState, useEffect } from 'react';
import { LeaderboardCategory, LeaderboardEntry, LeaderboardProps } from '../types';
import { Trophy, Globe, MapPin, Users, Crown, UserPlus, Search, Bell, Check, X, Mail } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

const STORAGE_KEY_WORLD = 'mindmap_leaderboard_world_v1';

export const Leaderboard: React.FC<LeaderboardProps> = ({ 
  currentUserMinutes, 
  userProfile, 
  friends, 
  incomingRequests = [],
  onSendRequest,
  onAcceptRequest,
  onRejectRequest
}) => {
  const [category, setCategory] = useState<LeaderboardCategory>('world');
  const [allEntries, setAllEntries] = useState<LeaderboardEntry[]>([]);
  const [displayEntries, setDisplayEntries] = useState<LeaderboardEntry[]>([]);
  
  // UI States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [friendIdInput, setFriendIdInput] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  // Helper to generate mock history
  const generateHistory = (currentRank: number) => {
    const history = [];
    for (let i = 0; i < 5; i++) {
      history.push(Math.max(1, currentRank + Math.floor(Math.random() * 5) - 2));
    }
    history.push(currentRank);
    return history;
  };

  // Initialize World Data Only
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY_WORLD);
    let data: LeaderboardEntry[] = [];

    if (stored) {
        data = JSON.parse(stored);
    } else {
        // Generate Initial Seed Data for World
        const names = [
          "Alice Chen", "Marcus Johnson", "Sarah Smith", "David Kim", "Elena Rodriguez", 
          "Tom Baker", "Yuki Tanaka", "Priya Patel", "James Wilson", "Maria Garcia"
        ];
        const baseMinutes = 600;

        data = names.map((name, index) => ({
          id: `user-${index}`,
          rank: 0,
          name: name,
          minutes: Math.floor(baseMinutes - (index * (baseMinutes / 15)) + (Math.random() * 100)),
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.replace(' ', '')}`,
          trend: Math.random() > 0.6 ? 'up' : Math.random() > 0.3 ? 'same' : 'down',
          rankHistory: [], 
          region: ['North America', 'Europe', 'Asia', 'South America'][Math.floor(Math.random() * 4)]
        }));
    }

    // Ensure data has rankHistory
    data = data.map((entry, idx) => {
       if (!entry.rankHistory || entry.rankHistory.length === 0) {
         return { ...entry, rankHistory: generateHistory(idx + 1) };
       }
       return entry;
    });

    setAllEntries(data);
    localStorage.setItem(STORAGE_KEY_WORLD, JSON.stringify(data));
  }, []);

  // Combine World Data with Friends and Current User for display
  useEffect(() => {
      // 1. Build the complete list (World + Friends + Me)
      let combined = [...allEntries];
      
      // Add Friends (avoiding duplicates if they somehow exist in world data)
      friends.forEach(friend => {
         if (!combined.some(e => e.id === friend.id)) {
             combined.push(friend);
         }
      });

      // Add Me
      const me: LeaderboardEntry = {
            id: userProfile.id,
            rank: 0,
            name: userProfile.name,
            minutes: currentUserMinutes,
            avatar: userProfile.avatar,
            trend: 'same',
            rankHistory: [],
            isCurrentUser: true,
            region: userProfile.region
      };
      
      // Update or Add "Me"
      const myIndex = combined.findIndex(e => e.isCurrentUser || e.id === userProfile.id);
      if (myIndex !== -1) {
          combined[myIndex] = { ...combined[myIndex], ...me }; // update stats
      } else {
          combined.push(me);
      }

      // 2. Filter based on category
      let filtered = [...combined];

      if (category === 'regional') {
          filtered = filtered.filter(e => e.isCurrentUser || e.region === userProfile.region || e.isFriend);
      } else if (category === 'friends') {
          filtered = filtered.filter(e => e.isCurrentUser || e.isFriend);
      }

      // 3. Rank Sort
      filtered.sort((a, b) => b.minutes - a.minutes);
      filtered = filtered.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
      
      setDisplayEntries(filtered);

  }, [category, allEntries, friends, currentUserMinutes, userProfile]);


  const handleSendRequestSubmit = () => {
    if (!friendIdInput.trim()) {
      setAddError("Please enter an ID.");
      return;
    }

    if (friendIdInput === userProfile.id) {
      setAddError("You cannot add yourself.");
      return;
    }
    
    if (friends.some(f => f.id === friendIdInput)) {
      setAddError("Already added as a friend.");
      return;
    }

    onSendRequest(friendIdInput.trim());
    setFriendIdInput('');
    setIsAddModalOpen(false);
  };

  const entries = displayEntries;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      
      {/* Friend Requests Modal (Inbox) */}
      {showRequests && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                     <Mail className="text-indigo-400" size={20} /> Friend Requests
                  </h3>
                  <button onClick={() => setShowRequests(false)} className="text-slate-500 hover:text-white"><X size={20}/></button>
               </div>
               
               <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {incomingRequests.length === 0 ? (
                     <div className="text-center py-8 text-slate-500">
                        <p>No pending requests.</p>
                     </div>
                  ) : (
                     incomingRequests.map(req => (
                        <div key={req.id} className="flex items-center gap-3 bg-slate-800 p-3 rounded-xl border border-slate-700">
                           <img src={req.fromUser.avatar} alt={req.fromUser.name} className="w-10 h-10 rounded-full bg-slate-900" />
                           <div className="flex-1">
                              <p className="text-sm font-bold text-white">{req.fromUser.name}</p>
                              <p className="text-xs text-slate-400">{req.fromUser.region}</p>
                           </div>
                           <div className="flex gap-2">
                              <button 
                                 onClick={() => onAcceptRequest(req.id)}
                                 className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                                 title="Accept"
                              >
                                 <Check size={16} />
                              </button>
                              <button 
                                 onClick={() => onRejectRequest(req.id)}
                                 className="p-2 bg-slate-700 hover:bg-red-900/50 hover:text-red-400 text-slate-300 rounded-lg transition-colors"
                                 title="Reject"
                              >
                                 <X size={16} />
                              </button>
                           </div>
                        </div>
                     ))
                  )}
               </div>
            </div>
         </div>
      )}

      {/* Send Request Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <UserPlus className="text-indigo-400" size={20} /> Send Friend Request
            </h3>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                value={friendIdInput}
                onChange={(e) => { setFriendIdInput(e.target.value); setAddError(null); }}
                placeholder="Enter Friend ID (e.g. MIND-8X29)"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-indigo-500 font-mono"
                autoFocus
              />
            </div>
            {addError && <p className="text-red-400 text-xs mb-4">{addError}</p>}
            <div className="flex gap-3">
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSendRequestSubmit}
                className="flex-1 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="text-yellow-400" size={28} /> Leaderboard
          </h2>
          <p className="text-slate-400">
            Region: <span className="text-indigo-300 font-medium">{userProfile.region}</span>
          </p>
        </div>
        
        {/* Tabs */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 p-1 rounded-xl flex border border-slate-800">
            <button 
              onClick={() => setCategory('world')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${category === 'world' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <Globe size={16} /> <span className="hidden sm:inline">World</span>
            </button>
            <button 
              onClick={() => setCategory('regional')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${category === 'regional' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <MapPin size={16} /> <span className="hidden sm:inline">Regional</span>
            </button>
            <button 
              onClick={() => setCategory('friends')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${category === 'friends' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <Users size={16} /> <span className="hidden sm:inline">Friends</span>
            </button>
          </div>

          <div className="flex gap-2">
             <button 
                onClick={() => setShowRequests(true)}
                className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition-colors relative"
                title="Friend Requests"
             >
                <Mail size={20} />
                {incomingRequests.length > 0 && (
                   <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-900">
                      {incomingRequests.length}
                   </span>
                )}
             </button>
             <button 
                onClick={() => setIsAddModalOpen(true)}
                className="p-3 bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700 rounded-xl transition-colors"
                title="Send Friend Request"
             >
                <UserPlus size={20} />
             </button>
          </div>
        </div>
      </div>

      {/* Top 3 Podium */}
      {entries.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 items-end justify-center max-w-3xl mx-auto py-8">
          {/* 2nd Place */}
          <div className="order-1 flex flex-col items-center">
            <div className="mb-2 relative">
                <img src={entries[1].avatar} alt={entries[1].name} className="w-16 h-16 rounded-full border-4 border-slate-400 bg-slate-200" />
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-500 text-white text-xs font-bold px-2 py-0.5 rounded-full border border-slate-300 shadow-sm">#2</div>
            </div>
            <div className="bg-slate-800/50 w-full h-24 rounded-t-xl border-t border-x border-slate-700 flex items-end justify-center pb-4 relative group hover:bg-slate-800/80 transition-colors">
                <div className="text-center">
                    <p className="font-bold text-white text-sm line-clamp-1 px-2">{entries[1].name}</p>
                    <p className="text-xs text-slate-400">{entries[1].minutes}m</p>
                </div>
            </div>
          </div>

          {/* 1st Place */}
          <div className="order-2 flex flex-col items-center z-10 -mb-4">
             <Crown className="text-yellow-400 mb-2 animate-bounce" size={32} fill="currentColor" />
             <div className="mb-2 relative">
                <img src={entries[0].avatar} alt={entries[0].name} className="w-24 h-24 rounded-full border-4 border-yellow-400 bg-yellow-100 shadow-xl shadow-yellow-500/20" />
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-yellow-950 text-sm font-bold px-3 py-0.5 rounded-full border border-yellow-300 shadow-sm">#1</div>
            </div>
            <div className="bg-gradient-to-b from-indigo-900/50 to-slate-800/50 w-full h-32 rounded-t-xl border-t border-x border-yellow-500/30 flex items-end justify-center pb-6 shadow-[0_-4px_20px_-5px_rgba(234,179,8,0.3)]">
                <div className="text-center">
                    <p className="font-bold text-white text-lg line-clamp-1 px-2">{entries[0].name}</p>
                    <p className="text-sm text-yellow-400 font-medium">{entries[0].minutes} min</p>
                </div>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="order-3 flex flex-col items-center">
            <div className="mb-2 relative">
                <img src={entries[2].avatar} alt={entries[2].name} className="w-16 h-16 rounded-full border-4 border-orange-400 bg-orange-100" />
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full border border-orange-300 shadow-sm">#3</div>
            </div>
            <div className="bg-slate-800/50 w-full h-20 rounded-t-xl border-t border-x border-slate-700 flex items-end justify-center pb-4 group hover:bg-slate-800/80 transition-colors">
                <div className="text-center">
                    <p className="font-bold text-white text-sm line-clamp-1 px-2">{entries[2].name}</p>
                    <p className="text-xs text-slate-400">{entries[2].minutes}m</p>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
         <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
           <div className="col-span-2 md:col-span-1 text-center">Rank</div>
           <div className="col-span-6 md:col-span-5">User</div>
           <div className="col-span-4 md:col-span-3 text-right">Focus Time</div>
           <div className="hidden md:block col-span-3 text-center">Trend</div>
         </div>
         
         <div className="divide-y divide-slate-800 max-h-[500px] overflow-y-auto">
           {entries.length > 3 ? (
             entries.slice(3).map((entry) => (
               <div 
                 key={entry.id} 
                 className={`grid grid-cols-12 gap-4 p-3 items-center hover:bg-slate-800/50 transition-colors ${entry.isCurrentUser ? 'bg-indigo-900/20 border-l-4 border-indigo-500' : ''}`}
               >
                 <div className="col-span-2 md:col-span-1 text-center font-mono font-bold text-slate-400">
                   #{entry.rank}
                 </div>
                 <div className="col-span-6 md:col-span-5 flex items-center gap-3">
                   <img src={entry.avatar} alt={entry.name} className="w-8 h-8 rounded-full bg-slate-700" />
                   <div>
                     <p className={`text-sm font-medium ${entry.isCurrentUser ? 'text-indigo-300' : 'text-white'}`}>
                       {entry.name} {entry.isCurrentUser && "(You)"}
                     </p>
                     {category === 'world' && entry.region && (
                       <p className="text-[10px] text-slate-500 hidden sm:block">{entry.region}</p>
                     )}
                   </div>
                 </div>
                 <div className="col-span-4 md:col-span-3 text-right text-sm font-mono text-slate-300">
                   {entry.minutes}m
                 </div>
                 <div className="hidden md:block col-span-3 h-8 w-full pr-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={entry.rankHistory?.map((val, i) => ({ i, val }))}>
                        <YAxis domain={['dataMin', 'dataMax']} hide reversed />
                        <Line 
                            type="monotone" 
                            dataKey="val" 
                            stroke={entry.trend === 'up' ? '#10b981' : entry.trend === 'down' ? '#ef4444' : '#64748b'} 
                            strokeWidth={2} 
                            dot={false} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                 </div>
               </div>
             ))
           ) : (
             <div className="p-8 text-center text-slate-500 text-sm">
               {category === 'friends' && entries.length < 4
                 ? "Use the + button to add friends by ID!" 
                 : "Keep studying to climb the ranks!"}
             </div>
           )}
         </div>
      </div>
    </div>
  );
};


import React, { useState, useRef, useEffect } from 'react';
import { StudyGroup, SharedPlanItem, SavedPlan, UserProfile, GroupMember, GroupsViewProps, LeaderboardEntry, GroupResource, GroupPoll } from '../types';
import { Users, Lock, Globe, Plus, Search, ArrowLeft, ArrowRight, Share2, Download, Heart, BookOpen, X, UserPlus, Check, MessageSquare, Send, FileText, Link, Image as ImageIcon, ExternalLink, Video, Youtube, Sparkles, Play, LogOut, Mic, MicOff, MonitorPlay, SmilePlus, CheckCheck, ScreenShare, ScreenShareOff, Timer, Activity, Clock, Vote, Pin, MoreVertical, FileBarChart, Loader2, Reply } from 'lucide-react';

export const GroupsView: React.FC<GroupsViewProps> = ({
  groups,
  userProfile,
  userPlans,
  friends,
  typingUsers = {},
  onCreateGroup,
  onJoinGroup,
  onSharePlan,
  onClonePlan,
  onAddMember,
  onSendMessage,
  onAddResource,
  onGetAIRecommendations,
  onUpdateGroupVideo,
  onToggleReaction,
  onMarkMessagesRead,
  onToggleScreenShare,
  onCreatePoll,
  onVotePoll,
  onPinMessage,
  onSummarizeChat,
  onUserTyping
}) => {
  const [activeTab, setActiveTab] = useState<'my-groups' | 'explore'>('my-groups');
  // Use ID instead of object to ensure we always render the latest data from props
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [activeGroupTab, setActiveGroupTab] = useState<'overview' | 'plans' | 'chat' | 'resources'>('overview');
  
  const selectedGroup = selectedGroupId ? groups.find(g => g.id === selectedGroupId) || null : null;

  // Live Room State
  const [isLiveRoomOpen, setIsLiveRoomOpen] = useState(false);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isAddResourceModalOpen, setIsAddResourceModalOpen] = useState(false);
  const [isAIResLoading, setIsAIResLoading] = useState(false);
  const [isCreatePollOpen, setIsCreatePollOpen] = useState(false);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [chatSummary, setChatSummary] = useState<string | null>(null);
  
  // Form States
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupPrivacy, setNewGroupPrivacy] = useState<'public' | 'private'>('public');
  
  // Resource Form
  const [resTitle, setResTitle] = useState('');
  const [resUrl, setResUrl] = useState('');
  const [resType, setResType] = useState<'link' | 'file' | 'image'>('link');
  const [resDesc, setResDesc] = useState('');

  // Poll Form
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [reactionMenuOpenId, setReactionMenuOpenId] = useState<string | null>(null);
  const [replyingToMessageId, setReplyingToMessageId] = useState<string | null>(null);
  const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '🔥', '🎉'];

  // Intersection Observer for Read Receipts
  const observerRef = useRef<IntersectionObserver | null>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Filtered Lists
  const myGroups = groups.filter(g => g.members.some(m => m.userId === userProfile.id));
  const publicGroups = groups.filter(g => g.privacy === 'public' && !g.members.some(m => m.userId === userProfile.id));

  useEffect(() => {
    if (activeGroupTab === 'chat' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeGroupTab, selectedGroup?.messages, typingUsers]);

  // --- READ RECEIPT LOGIC ---
  useEffect(() => {
     if (activeGroupTab !== 'chat' || !selectedGroup) return;

     // Initialize Observer
     observerRef.current = new IntersectionObserver((entries) => {
        const visibleMessageIds: string[] = [];
        entries.forEach(entry => {
           if (entry.isIntersecting) {
              const msgId = entry.target.getAttribute('data-message-id');
              if (msgId) {
                 visibleMessageIds.push(msgId);
                 // Stop observing once read
                 observerRef.current?.unobserve(entry.target);
              }
           }
        });

        if (visibleMessageIds.length > 0) {
           onMarkMessagesRead(selectedGroup.id, visibleMessageIds);
        }
     }, { threshold: 0.5 });

     // Observe unread messages that are not mine
     const messages = selectedGroup.messages || [];
     messages.forEach(msg => {
        // If message is not from me AND I haven't read it yet
        if (msg.userId !== userProfile.id && !(msg.readBy || []).includes(userProfile.id)) {
           const el = messageRefs.current.get(msg.id);
           if (el) {
              observerRef.current?.observe(el);
           }
        }
     });

     return () => {
        observerRef.current?.disconnect();
     };
  }, [selectedGroup?.messages, activeGroupTab, selectedGroupId]);


  const handleCreateSubmit = () => {
    if (newGroupName.trim()) {
      onCreateGroup(newGroupName, newGroupDesc, newGroupPrivacy);
      setIsCreateModalOpen(false);
      setNewGroupName('');
      setNewGroupDesc('');
      setActiveTab('my-groups'); // Switch to see the new group
    }
  };

  const handleShareSubmit = (plan: SavedPlan) => {
    if (selectedGroup) {
      onSharePlan(selectedGroup.id, plan);
      setIsShareModalOpen(false);
    }
  };

  const handleAddMemberSubmit = (friend: LeaderboardEntry) => {
     if (selectedGroup) {
       onAddMember(selectedGroup.id, friend);
       setIsAddMemberModalOpen(false);
     }
  };

  const handleSendMessageSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (selectedGroup && chatInput.trim()) {
      onSendMessage(selectedGroup.id, chatInput.trim(), replyingToMessageId || undefined);
      setChatInput('');
      setReplyingToMessageId(null);
    }
  };

  const handleResourceSubmit = () => {
    if (selectedGroup && resTitle && resUrl) {
      onAddResource(selectedGroup.id, {
        title: resTitle,
        url: resUrl,
        type: resType,
        description: resDesc
      });
      setIsAddResourceModalOpen(false);
      setResTitle('');
      setResUrl('');
      setResDesc('');
      setResType('link');
    }
  };

  const handleCreatePollSubmit = () => {
    if (selectedGroup && pollQuestion && pollOptions.every(o => o.trim())) {
       onCreatePoll(selectedGroup.id, pollQuestion, pollOptions);
       setIsCreatePollOpen(false);
       setPollQuestion('');
       setPollOptions(['', '']);
    }
  };

  const handleAIRecommendation = async () => {
    if (selectedGroup) {
      setIsAIResLoading(true);
      try {
        // Guess subject from group name or description
        const subject = selectedGroup.name; 
        const suggestions = await onGetAIRecommendations(subject);
        
        suggestions.forEach((query: string) => {
           const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
           onAddResource(selectedGroup.id, {
             title: `📺 Recommended: ${query}`,
             url: ytUrl,
             type: 'link',
             description: 'AI Generated Video Search Topic'
           });
        });
        setActiveGroupTab('resources');
      } catch (e) {
        console.error(e);
      } finally {
        setIsAIResLoading(false);
      }
    }
  };

  const handleRequestSummary = async () => {
    if (!selectedGroup) return;
    setIsSummaryLoading(true);
    setChatSummary(null);
    try {
      const summary = await onSummarizeChat(selectedGroup.id);
      setChatSummary(summary);
    } catch (e) {
      setChatSummary("Error generating summary.");
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // --- ACTIVITY FEED HELPER ---
  const getGroupActivity = (group: StudyGroup) => {
    const activities: { id: string; type: 'join' | 'plan' | 'resource'; timestamp: string; user: { name: string; avatar: string }; details: string }[] = [];

    // Member Joins
    group.members.forEach(m => {
      activities.push({
        id: `join-${m.userId}`,
        type: 'join',
        timestamp: m.joinedAt,
        user: { name: m.name, avatar: m.avatar },
        details: 'joined the group'
      });
    });

    // Plans Shared
    group.sharedPlans.forEach(p => {
      activities.push({
        id: p.id,
        type: 'plan',
        timestamp: p.sharedAt,
        user: p.sharedBy,
        details: `shared a plan: ${p.planTitle}`
      });
    });

    // Resources Added
    group.resources?.forEach(r => {
      activities.push({
        id: r.id,
        type: 'resource',
        timestamp: r.addedAt,
        user: r.addedBy,
        details: `added a resource: ${r.title}`
      });
    });

    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  // --- RENDER HELPERS ---

  const renderPoll = (pollId: string) => {
     const poll = selectedGroup?.polls?.find(p => p.id === pollId);
     if (!poll) return null;

     const totalVotes = poll.options.reduce((acc, curr) => acc + curr.votes.length, 0);
     const hasVoted = poll.options.some(opt => opt.votes.includes(userProfile.id));

     return (
       <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 w-full max-w-xs">
          <div className="flex items-center gap-2 mb-3">
             <FileBarChart size={16} className="text-indigo-400" />
             <h4 className="font-bold text-white text-sm">{poll.question}</h4>
          </div>
          <div className="space-y-2">
             {poll.options.map(opt => {
                const percentage = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                const isSelected = opt.votes.includes(userProfile.id);
                return (
                  <button 
                    key={opt.id}
                    onClick={() => onVotePoll(selectedGroup!.id, poll.id, opt.id)}
                    className="w-full relative h-8 rounded bg-slate-900 overflow-hidden border border-slate-700 hover:border-indigo-500/50 transition-colors group/pollopt"
                  >
                     <div 
                       className="absolute top-0 left-0 h-full bg-indigo-600/30 transition-all duration-500"
                       style={{ width: `${percentage}%` }}
                     />
                     <div className="absolute inset-0 flex items-center justify-between px-3 z-10">
                        <span className="text-xs font-medium text-white flex items-center gap-2">
                           {isSelected && <Check size={12} className="text-indigo-400" />} {opt.text}
                        </span>
                        <span className="text-xs text-slate-400">{percentage}% ({opt.votes.length})</span>
                     </div>
                  </button>
                );
             })}
          </div>
          <div className="mt-3 text-xs text-slate-500 text-right">
             {totalVotes} votes • {hasVoted ? "Voted" : "Vote now"}
          </div>
       </div>
     );
  };

  const renderGroupCard = (group: StudyGroup, isMember: boolean) => (
    <div 
      key={group.id}
      onClick={() => isMember ? setSelectedGroupId(group.id) : onJoinGroup(group.id)}
      className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-3">
        <div className={`p-3 rounded-lg ${group.privacy === 'private' ? 'bg-amber-500/10 text-amber-500' : 'bg-indigo-500/10 text-indigo-400'}`}>
          {group.privacy === 'private' ? <Lock size={20} /> : <Globe size={20} />}
        </div>
        {!isMember && (
           <span className="bg-slate-700 text-slate-300 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide group-hover:bg-indigo-600 group-hover:text-white transition-colors">
             Join
           </span>
        )}
      </div>
      
      <h3 className="text-lg font-bold text-white mb-1">{group.name}</h3>
      <p className="text-sm text-slate-400 mb-4 line-clamp-2 h-10">{group.description}</p>

      <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Users size={14} />
          <span>{group.members.length} members</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <BookOpen size={14} />
          <span>{group.sharedPlans.length} plans</span>
        </div>
      </div>
    </div>
  );

  const LiveRoom = ({ group }: { group: StudyGroup }) => {
    const activeVideoId = group.activeVideo?.url ? getYoutubeId(group.activeVideo.url) : null;
    const startedAt = group.activeVideo?.startedAt ? new Date(group.activeVideo.startedAt).getTime() : Date.now();
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isSyncOpen, setIsSyncOpen] = useState(false);
    const [seekTimeInput, setSeekTimeInput] = useState('0:00');

    const isScreenSharingActive = !!group.activeScreenShare;
    const amISharing = group.activeScreenShare?.userId === userProfile.id;

    useEffect(() => {
      if (videoRef.current && localStream) {
        videoRef.current.srcObject = localStream;
      }
    }, [localStream]);

    useEffect(() => {
      return () => {
         if (localStream) {
           localStream.getTracks().forEach(track => track.stop());
         }
      }
    }, []); 

    const toggleScreenShare = async () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
        onToggleScreenShare(group.id, false);
      } else {
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          setLocalStream(stream);
          onToggleScreenShare(group.id, true);
          stream.getVideoTracks()[0].onended = () => {
             setLocalStream(null);
             onToggleScreenShare(group.id, false);
          };
        } catch (e) {
          console.error("Cancelled screen share", e);
        }
      }
    };

    const handleSyncSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const parts = seekTimeInput.split(':').map(Number);
        let totalSeconds = 0;
        if (parts.length === 2) {
            totalSeconds = parts[0] * 60 + parts[1];
        } else if (parts.length === 1) {
            totalSeconds = parts[0];
        }

        if (group.activeVideo?.url) {
             onUpdateGroupVideo(group.id, group.activeVideo.url, group.activeVideo.title, totalSeconds);
             setIsSyncOpen(false);
        }
    };

    const handleLeaveRoom = () => {
      if (localStream) {
         localStream.getTracks().forEach(track => track.stop());
         onToggleScreenShare(group.id, false);
      }
      setIsLiveRoomOpen(false);
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-in zoom-in-95 duration-300">
            <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <h2 className="font-bold text-white">{group.name} <span className="text-slate-500 font-normal text-sm ml-2">Live Room</span></h2>
                </div>
                <div className="flex items-center gap-4">
                   {!isScreenSharingActive || amISharing ? (
                      <button 
                        onClick={toggleScreenShare}
                        className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${amISharing ? 'bg-red-900/20 text-red-400 hover:bg-red-900/40' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                      >
                        {amISharing ? <ScreenShareOff size={16} /> : <ScreenShare size={16} />}
                        {amISharing ? 'Stop Sharing' : 'Share Screen'}
                      </button>
                   ) : null}

                   <button 
                      onClick={handleLeaveRoom}
                      className="px-4 py-2 bg-red-900/20 text-red-400 hover:bg-red-900/40 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                   >
                      <LogOut size={16} /> Leave Room
                   </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 bg-black flex flex-col relative">
                    {isScreenSharingActive ? (
                       <div className="flex-1 flex items-center justify-center bg-black relative">
                           {amISharing ? (
                              <video ref={videoRef} autoPlay muted className="w-full h-full max-h-[85vh] object-contain" />
                           ) : (
                              <div className="text-center">
                                 <div className="bg-indigo-900/30 p-6 rounded-2xl border border-indigo-500/30 mb-4 inline-block animate-pulse">
                                    <ScreenShare size={48} className="text-indigo-400 mx-auto mb-2" />
                                    <h3 className="text-xl font-bold text-white">{group.activeScreenShare?.userName} is sharing their screen</h3>
                                 </div>
                                 <p className="text-slate-500 text-sm">
                                    (Remote stream viewing requires backend implementation)
                                 </p>
                              </div>
                           )}
                           <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs text-white border border-white/10 flex items-center gap-2">
                               <ScreenShare size={12} className="text-indigo-400" />
                               {amISharing ? "You are sharing your screen" : `${group.activeScreenShare?.userName}'s Screen`}
                           </div>
                       </div>
                    ) : activeVideoId ? (
                         <div className="flex-1 flex items-center justify-center bg-black relative group/video">
                             <iframe 
                                key={`${activeVideoId}-${startedAt}`} 
                                src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1&start=${elapsedSeconds}`} 
                                className="w-full h-full max-h-[80vh] max-w-[120vh] aspect-video shadow-2xl"
                                title="Study Room Video"
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                              ></iframe>
                              
                              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs text-white border border-white/10 flex items-center gap-2">
                                 <Youtube size={12} className="text-red-500" />
                                 Now Watching: {group.activeVideo?.title || "Shared Video"}
                              </div>

                              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/video:opacity-100 transition-opacity">
                                   {isSyncOpen ? (
                                      <form onSubmit={handleSyncSubmit} className="bg-slate-900/90 backdrop-blur border border-slate-700 p-2 rounded-xl flex items-center gap-2">
                                          <input 
                                            type="text" 
                                            value={seekTimeInput}
                                            onChange={(e) => setSeekTimeInput(e.target.value)}
                                            placeholder="MM:SS"
                                            className="w-20 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono text-center"
                                          />
                                          <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded text-xs font-bold">
                                              Go
                                          </button>
                                          <button type="button" onClick={() => setIsSyncOpen(false)} className="text-slate-400 hover:text-white px-1">
                                              <X size={14} />
                                          </button>
                                      </form>
                                   ) : (
                                      <button 
                                        onClick={() => setIsSyncOpen(true)}
                                        className="bg-black/60 backdrop-blur hover:bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium border border-white/20 transition-colors flex items-center gap-2"
                                      >
                                          <Timer size={16} /> Sync Playback
                                      </button>
                                   )}
                              </div>
                         </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center bg-slate-900/50">
                             <div className="text-center p-8">
                                 <div className="bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                    <Video size={32} className="text-slate-500" />
                                 </div>
                                 <h3 className="text-xl font-bold text-white mb-2">No Video Playing</h3>
                                 <p className="text-slate-500 max-w-sm mx-auto">
                                    Select a YouTube link from the Resources tab to watch together, or just hang out and focus!
                                 </p>
                             </div>
                        </div>
                    )}
                    
                    <div className="h-32 bg-slate-900/90 border-t border-slate-800 flex items-center px-6 gap-4 overflow-x-auto">
                        {group.members.map(member => {
                            const isOnline = member.activeStatus?.isOnline;
                            return (
                                <div key={member.userId} className={`flex flex-col items-center min-w-[80px] transition-opacity ${isOnline ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                                    <div className="relative">
                                        <img src={member.avatar} className="w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-700" alt={member.name} />
                                        {isOnline && (
                                            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                                        )}
                                    </div>
                                    <p className="text-xs text-white font-medium mt-2 truncate max-w-[80px]">{member.name}</p>
                                    {isOnline && (
                                        <p className="text-[10px] text-indigo-400 truncate max-w-[80px]">{member.activeStatus?.currentFocus || "Chilling"}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0">
                    <div className="p-4 border-b border-slate-800 font-bold text-white flex items-center gap-2">
                        <MessageSquare size={18} className="text-indigo-400" /> Room Chat
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/30">
                         {group.messages?.map(msg => (
                             <div key={msg.id} className="flex flex-col">
                                 <div className="flex items-center gap-2 mb-1">
                                     <span className="text-xs font-bold text-slate-400">{msg.userName}</span>
                                     <span className="text-[10px] text-slate-600">{new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                 </div>
                                 <div className="bg-slate-800 text-slate-200 px-3 py-2 rounded-lg text-sm">
                                     {msg.content}
                                 </div>
                             </div>
                         ))}
                         <div ref={chatEndRef} />
                    </div>
                    <div className="p-3 border-t border-slate-800">
                        <form onSubmit={handleSendMessageSubmit} className="flex gap-2">
                            <input 
                                type="text" 
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                                placeholder="Message..."
                            />
                            <button type="submit" className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg">
                                <Send size={16} />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  if (selectedGroup) {
    const isAdmin = selectedGroup.members.find(m => m.userId === userProfile.id)?.role === 'admin';
    const onlineMembers = selectedGroup.members.filter(m => m.activeStatus?.isOnline);
    const pinnedMessages = selectedGroup.messages?.filter(m => m.isPinned) || [];
    const currentTypingUsers = typingUsers[selectedGroup.id] || [];
    
    // Calculate reply text if replying
    const replyingToMessage = replyingToMessageId 
       ? selectedGroup.messages?.find(m => m.id === replyingToMessageId) 
       : null;

    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-300 pb-20">
        {isLiveRoomOpen && <LiveRoom group={selectedGroup} />}

        <button 
          onClick={() => setSelectedGroupId(null)}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Groups
        </button>

        <div className="bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border border-indigo-500/30 rounded-2xl p-1 mb-6 shadow-lg shadow-indigo-900/20">
           <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                 <div className="relative">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse absolute -top-1 -right-1 border-2 border-slate-900"></div>
                    <Video className="text-indigo-300" size={24} />
                 </div>
                 <div>
                    <h3 className="text-white font-bold text-sm">Live Study Room</h3>
                    <p className="text-xs text-indigo-300">
                       {onlineMembers.length > 0 ? `${onlineMembers.length} members focusing now` : 'Room is quiet. Start studying!'}
                    </p>
                 </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center -space-x-2">
                    {onlineMembers.slice(0, 5).map((m, i) => (
                        <div key={i} className="relative group/avatar">
                        <img src={m.avatar} alt={m.name} className="w-10 h-10 rounded-full border-2 border-slate-900" />
                        <div className="absolute -bottom-1 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900"></div>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-xs text-white rounded whitespace-nowrap opacity-0 group-hover/avatar:opacity-100 transition-opacity border border-slate-700 pointer-events-none">
                            {m.name}: {m.activeStatus?.currentFocus || "Studying"}
                        </div>
                        </div>
                    ))}
                </div>
                
                <button 
                    onClick={() => setIsLiveRoomOpen(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-indigo-500/20 transition-transform hover:scale-105 flex items-center gap-2"
                >
                    <MonitorPlay size={16} /> Join Room
                </button>
              </div>
           </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                 <h1 className="text-3xl font-bold text-white">{selectedGroup.name}</h1>
                 <span className={`text-xs font-bold px-2 py-1 rounded-full border uppercase tracking-wider ${selectedGroup.privacy === 'private' ? 'bg-amber-900/20 border-amber-500/30 text-amber-400' : 'bg-indigo-900/20 border-indigo-500/30 text-indigo-400'}`}>
                    {selectedGroup.privacy}
                 </span>
              </div>
              <p className="text-slate-400 max-w-2xl">{selectedGroup.description}</p>
            </div>
            <div className="flex gap-3">
                {isAdmin && (
                   <button 
                     onClick={() => setIsAddMemberModalOpen(true)}
                     className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl font-semibold transition-colors"
                   >
                     <UserPlus size={18} /> Invite
                   </button>
                )}
                <button 
                  onClick={() => setIsShareModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-900/30 transition-transform hover:scale-105"
                >
                  <Share2 size={18} /> Share a Plan
                </button>
            </div>
          </div>
          <div className="flex items-center gap-6 mt-6 pt-6 border-t border-slate-800 relative z-10">
            <div className="flex items-center -space-x-2">
              {selectedGroup.members.slice(0, 5).map((m, i) => (
                <img key={i} src={m.avatar} alt={m.name} className="w-8 h-8 rounded-full border-2 border-slate-900" title={m.name} />
              ))}
              {selectedGroup.members.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-800 flex items-center justify-center text-xs text-white font-medium">
                  +{selectedGroup.members.length - 5}
                </div>
              )}
            </div>
            <div className="text-sm text-slate-400">
              <strong className="text-white">{selectedGroup.members.length}</strong> Students Learning Together
            </div>
          </div>
        </div>

        <div className="flex gap-6 border-b border-slate-800 mb-6">
           <button 
             onClick={() => setActiveGroupTab('overview')}
             className={`pb-3 text-sm font-medium transition-all relative flex items-center gap-2 ${activeGroupTab === 'overview' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
           >
             <Activity size={16} /> Overview
             {activeGroupTab === 'overview' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full"></span>}
           </button>
           <button 
             onClick={() => setActiveGroupTab('plans')}
             className={`pb-3 text-sm font-medium transition-all relative flex items-center gap-2 ${activeGroupTab === 'plans' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
           >
             <BookOpen size={16} /> Shared Plans ({selectedGroup.sharedPlans.length})
             {activeGroupTab === 'plans' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full"></span>}
           </button>
           <button 
             onClick={() => setActiveGroupTab('chat')}
             className={`pb-3 text-sm font-medium transition-all relative flex items-center gap-2 ${activeGroupTab === 'chat' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
           >
             <MessageSquare size={16} /> Discussion ({selectedGroup.messages?.length || 0})
             {activeGroupTab === 'chat' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full"></span>}
           </button>
           <button 
             onClick={() => setActiveGroupTab('resources')}
             className={`pb-3 text-sm font-medium transition-all relative flex items-center gap-2 ${activeGroupTab === 'resources' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
           >
             <Video size={16} /> Resources ({selectedGroup.resources?.length || 0})
             {activeGroupTab === 'resources' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full"></span>}
           </button>
        </div>

        {activeGroupTab === 'overview' ? (
          <div className="animate-in fade-in grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
               <h3 className="text-lg font-bold text-white flex items-center gap-2">
                 <Activity size={18} className="text-emerald-400" /> Activity Feed
               </h3>
               <div className="space-y-6 relative before:absolute before:left-4 before:top-0 before:bottom-0 before:w-0.5 before:bg-slate-800">
                  {getGroupActivity(selectedGroup).map((item, idx) => (
                     <div key={`${item.type}-${item.id}-${idx}`} className="relative pl-10">
                        <div className={`absolute left-0 top-0 w-8 h-8 rounded-full border-4 border-slate-950 flex items-center justify-center z-10 ${item.type === 'join' ? 'bg-blue-500' : item.type === 'plan' ? 'bg-purple-500' : 'bg-emerald-500'}`}>
                           {item.type === 'join' ? <UserPlus size={14} className="text-white" /> : item.type === 'plan' ? <Share2 size={14} className="text-white" /> : <Link size={14} className="text-white" />}
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                           <div className="flex items-center gap-3 mb-2">
                              <img src={item.user.avatar} alt={item.user.name} className="w-6 h-6 rounded-full bg-slate-800" />
                              <p className="text-sm font-bold text-white">{item.user.name}</p>
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                 <Clock size={12} /> {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                              </span>
                           </div>
                           <p className="text-sm text-slate-300">
                             {item.details}
                           </p>
                           {item.type === 'plan' && (
                              <button onClick={() => setActiveGroupTab('plans')} className="mt-2 text-xs text-indigo-400 hover:text-white font-medium flex items-center gap-1">
                                View Plan <ArrowRight size={12} />
                              </button>
                           )}
                        </div>
                     </div>
                  ))}
                  {getGroupActivity(selectedGroup).length === 0 && (
                    <div className="pl-10 py-4 text-slate-500 text-sm">No recent activity.</div>
                  )}
               </div>
            </div>
            <div className="space-y-6">
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">About</h3>
                  <p className="text-sm text-slate-300 mb-4">{selectedGroup.description}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                     <Clock size={14} /> Created {new Date(selectedGroup.createdAt).toLocaleDateString()}
                  </div>
               </div>
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Stats</h3>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-white">{selectedGroup.members.length}</div>
                        <div className="text-xs text-slate-500">Members</div>
                     </div>
                     <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-white">{selectedGroup.sharedPlans.length}</div>
                        <div className="text-xs text-slate-500">Plans</div>
                     </div>
                     <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-white">{selectedGroup.messages?.length || 0}</div>
                        <div className="text-xs text-slate-500">Messages</div>
                     </div>
                     <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-white">{selectedGroup.resources?.length || 0}</div>
                        <div className="text-xs text-slate-500">Resources</div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        ) : activeGroupTab === 'plans' ? (
          <>
            {selectedGroup.sharedPlans.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-2xl animate-in fade-in">
                <div className="bg-slate-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Share2 className="text-slate-600" size={24} />
                </div>
                <p className="text-slate-500">No plans shared yet. Be the first!</p>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in">
                {[...selectedGroup.sharedPlans].reverse().map((plan) => (
                  <div key={plan.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3 mb-3">
                        <img src={plan.sharedBy.avatar} alt={plan.sharedBy.name} className="w-10 h-10 rounded-full bg-slate-800" />
                        <div>
                          <p className="text-sm font-medium text-white">{plan.sharedBy.name}</p>
                          <p className="text-xs text-slate-500">{new Date(plan.sharedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => onClonePlan(plan)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500 hover:text-white transition-all text-sm font-medium"
                      >
                        <Download size={14} /> Save to Dashboard
                      </button>
                    </div>
                    <div className="ml-13 pl-13">
                       <h3 className="text-lg font-bold text-white mb-2 pl-13">{plan.planTitle}</h3>
                       <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-800 text-sm text-slate-300 italic mb-4">
                         "{plan.planOverview}"
                       </div>
                       <div className="flex gap-4">
                         <div className="flex items-center gap-1 text-xs text-slate-500">
                           <Heart size={14} /> {plan.likes} likes
                         </div>
                         <div className="flex items-center gap-1 text-xs text-slate-500">
                           <Download size={14} /> {plan.clones} saves
                         </div>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : activeGroupTab === 'resources' ? (
          <div className="animate-in fade-in">
             <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h3 className="text-lg font-bold text-white">Shared Materials & Videos</h3>
                <div className="flex gap-3">
                  <button 
                    onClick={handleAIRecommendation}
                    disabled={isAIResLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium disabled:opacity-70 shadow-lg shadow-purple-900/20"
                  >
                    {isAIResLoading ? <Sparkles size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    Ask AI for Videos
                  </button>
                  <button 
                    onClick={() => setIsAddResourceModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium"
                  >
                    <Plus size={16} /> Add Resource
                  </button>
                </div>
             </div>

             {(!selectedGroup.resources || selectedGroup.resources.length === 0) ? (
                <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-2xl">
                   <div className="bg-slate-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="text-slate-600" size={24} />
                   </div>
                   <p className="text-slate-500">No study materials shared yet.</p>
                </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[...selectedGroup.resources].reverse().map(res => {
                     const youtubeId = getYoutubeId(res.url);
                     return (
                       <div key={res.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-indigo-500/30 transition-colors flex flex-col">
                          {youtubeId ? (
                            <div className="relative w-full aspect-video bg-black group">
                              <iframe 
                                src={`https://www.youtube.com/embed/${youtubeId}`} 
                                className="absolute inset-0 w-full h-full"
                                title={res.title}
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                              ></iframe>
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                 <button 
                                   onClick={() => {
                                       onUpdateGroupVideo(selectedGroup.id, res.url, res.title);
                                       setIsLiveRoomOpen(true);
                                   }}
                                   className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-xl"
                                 >
                                    <MonitorPlay size={20} /> Watch Together in Room
                                 </button>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 border-b border-slate-800/50 bg-slate-800/50">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${res.type === 'link' ? 'bg-blue-500/10 text-blue-400' : res.type === 'file' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                 {res.type === 'link' ? <Link size={20} /> : res.type === 'file' ? <FileText size={20} /> : <ImageIcon size={20} />}
                              </div>
                            </div>
                          )}
                          <div className="p-4 flex-1 flex flex-col">
                             <div className="mb-3">
                               <h4 className="text-white font-medium line-clamp-2">{res.title}</h4>
                               <p className="text-xs text-slate-500 mt-1">
                                 Added by {res.addedBy.name} • {new Date(res.addedAt).toLocaleDateString()}
                               </p>
                             </div>
                             {res.description && <p className="text-sm text-slate-400 mb-4 line-clamp-2 flex-1">{res.description}</p>}
                             {!youtubeId && (
                               <a 
                                 href={res.url} 
                                 target="_blank" 
                                 rel="noopener noreferrer"
                                 className="mt-auto flex items-center justify-center gap-2 w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium text-indigo-300 transition-colors border border-slate-700"
                               >
                                 Open Resource <ExternalLink size={12} />
                               </a>
                             )}
                          </div>
                       </div>
                     );
                  })}
               </div>
             )}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[600px] animate-in fade-in">
             {pinnedMessages.length > 0 && (
               <div className="bg-slate-950/50 border-b border-slate-800 p-3 flex items-center gap-3">
                  <Pin size={16} className="text-indigo-400 shrink-0" fill="currentColor" />
                  <div className="flex-1 overflow-hidden">
                     <p className="text-xs font-bold text-white">Pinned</p>
                     <p className="text-xs text-slate-400 truncate">{pinnedMessages[pinnedMessages.length-1].content}</p>
                  </div>
               </div>
             )}
             <div className="p-2 bg-slate-950/30 border-b border-slate-800 flex justify-end gap-2">
                <button 
                  onClick={handleRequestSummary}
                  disabled={isSummaryLoading}
                  className="text-xs flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded transition-colors"
                >
                  {isSummaryLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Summarize Chat
                </button>
                <button 
                  onClick={() => setIsCreatePollOpen(true)}
                  className="text-xs flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded transition-colors"
                >
                  <Vote size={12} /> Create Poll
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950/30 relative">
               {chatSummary && (
                  <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4 mb-4 animate-in slide-in-from-top-4">
                     <div className="flex justify-between items-start mb-2">
                       <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                          <Sparkles size={14} /> AI Chat Summary
                       </h4>
                       <button onClick={() => setChatSummary(null)}><X size={14} className="text-slate-500" /></button>
                     </div>
                     <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{chatSummary}</p>
                  </div>
               )}

               {(!selectedGroup.messages || selectedGroup.messages.length === 0) ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500">
                     <MessageSquare size={48} className="mb-4 opacity-20" />
                     <p>Start the discussion!</p>
                  </div>
               ) : (
                  selectedGroup.messages.map((msg) => {
                    const isMe = msg.userId === userProfile.id;
                    const hasReactions = msg.reactions && msg.reactions.length > 0;
                    const readCount = msg.readBy ? msg.readBy.length : 0;
                    const isReadByAll = readCount >= (selectedGroup.members.length); 

                    // Get readable names of who read it (excluding sender)
                    const readers = selectedGroup.members
                        .filter(m => (msg.readBy || []).includes(m.userId) && m.userId !== msg.userId)
                        .map(m => m.name.split(' ')[0]);

                    if (msg.pollId) {
                       return (
                         <div key={msg.id} className="flex justify-center py-4 w-full">
                            {renderPoll(msg.pollId)}
                         </div>
                       );
                    }

                    return (
                      <div 
                        key={msg.id} 
                        ref={el => { if(el) messageRefs.current.set(msg.id, el); }}
                        data-message-id={msg.id}
                        className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''} group/message animate-in slide-in-from-bottom-2 duration-200 w-full`}
                      >
                         <img src={msg.userAvatar} alt={msg.userName} className="w-8 h-8 rounded-full bg-slate-800 self-end mb-1" />
                         <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col relative group/bubble`}>
                            {/* Reply Context */}
                            {msg.replyTo && (
                               <div className={`text-xs mb-1 opacity-70 p-1 border-l-2 ${isMe ? 'border-indigo-300 text-right mr-1' : 'border-slate-500 ml-1'}`}>
                                  <span className="font-bold">{msg.replyTo.userName}</span>
                                  <p className="line-clamp-1">{msg.replyTo.content}</p>
                               </div>
                            )}

                            <div className={`relative px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-slate-800 text-slate-200 rounded-bl-sm'} ${msg.isPinned ? 'border-2 border-indigo-400/50' : ''}`}>
                               {msg.content}
                               <div className={`absolute ${isMe ? '-left-24' : '-right-24'} top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover/bubble:opacity-100 transition-opacity ${reactionMenuOpenId === msg.id ? 'opacity-100' : ''}`}>
                                 <button 
                                   onClick={() => setReactionMenuOpenId(reactionMenuOpenId === msg.id ? null : msg.id)}
                                   className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
                                   title="Add Reaction"
                                 >
                                    <SmilePlus size={16} />
                                 </button>
                                 <button 
                                   onClick={() => {
                                      setReplyingToMessageId(msg.id);
                                      if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
                                   }}
                                   className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
                                   title="Reply"
                                 >
                                    <Reply size={16} />
                                 </button>
                                 {isAdmin && (
                                   <button 
                                     onClick={() => onPinMessage(selectedGroup.id, msg.id, !msg.isPinned)}
                                     className={`p-1.5 rounded-full bg-slate-800 hover:text-white ${msg.isPinned ? 'text-indigo-400' : 'text-slate-400'}`}
                                     title={msg.isPinned ? "Unpin" : "Pin"}
                                   >
                                      <Pin size={16} fill={msg.isPinned ? "currentColor" : "none"} />
                                   </button>
                                 )}
                               </div>
                               {reactionMenuOpenId === msg.id && (
                                  <div className={`absolute bottom-full ${isMe ? 'right-0' : 'left-0'} mb-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-2 flex gap-1 z-20`}>
                                     {REACTION_EMOJIS.map(emoji => (
                                        <button 
                                          key={emoji}
                                          onClick={() => {
                                             onToggleReaction(selectedGroup.id, msg.id, emoji);
                                             setReactionMenuOpenId(null);
                                          }}
                                          className="hover:bg-slate-700 p-1.5 rounded text-lg transition-colors leading-none"
                                        >
                                          {emoji}
                                        </button>
                                     ))}
                                  </div>
                               )}
                            </div>
                            {hasReactions && (
                              <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                {msg.reactions?.map(reaction => {
                                   const iReacted = reaction.userIds.includes(userProfile.id);
                                   return (
                                     <button 
                                       key={reaction.emoji}
                                       onClick={() => onToggleReaction(selectedGroup.id, msg.id, reaction.emoji)}
                                       className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${iReacted ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                                     >
                                       <span>{reaction.emoji}</span>
                                       <span className="font-mono">{reaction.userIds.length}</span>
                                     </button>
                                   );
                                })}
                              </div>
                            )}
                            <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-slate-600">
                               {msg.isPinned && <Pin size={10} className="text-indigo-400" fill="currentColor" />}
                               {!isMe && <span>{msg.userName} • </span>}
                               <span>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                               {isMe && (
                                  <div className="flex items-center gap-1 ml-1 cursor-help" title={readers.join(', ')}>
                                     {isReadByAll ? (
                                        <span className="flex items-center text-indigo-400 gap-1">
                                           <CheckCheck size={12} /> <span>All</span>
                                        </span>
                                     ) : readers.length > 0 ? (
                                        <span className="flex items-center text-slate-500 gap-1">
                                           <CheckCheck size={12} /> 
                                           <span>{readers.slice(0, 2).join(', ')}{readers.length > 2 ? ` +${readers.length - 2}` : ''}</span>
                                        </span>
                                     ) : (
                                        <Check size={12} className="text-slate-600" />
                                     )}
                                  </div>
                               )}
                            </div>
                         </div>
                      </div>
                    );
                  })
               )}
               {/* Typing Indicator */}
               {currentTypingUsers.length > 0 && (
                  <div className="flex gap-3 animate-in fade-in duration-500 ease-out">
                      <div className="w-8 h-8 rounded-full bg-slate-800/50 flex items-center justify-center">
                         <div className="w-2 h-2 bg-slate-600 rounded-full animate-ping opacity-75"></div>
                      </div>
                      <div className="bg-slate-800/50 rounded-2xl px-4 py-3 rounded-bl-sm flex items-center gap-1">
                         <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                         <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                         <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                         <span className="text-xs text-slate-500 ml-2 font-medium animate-pulse">
                            {currentTypingUsers.join(', ')} {currentTypingUsers.length === 1 ? 'is' : 'are'} typing...
                         </span>
                      </div>
                  </div>
               )}
               <div ref={chatEndRef} />
             </div>
             <div className="p-4 bg-slate-900 border-t border-slate-800">
                {replyingToMessage && (
                   <div className="flex items-center justify-between bg-slate-800/50 rounded-t-lg p-2 text-xs border-b border-slate-700/50 mb-1 animate-in slide-in-from-bottom-2">
                      <div className="flex items-center gap-2 text-slate-400">
                         <Reply size={12} />
                         <span>Replying to <strong>{replyingToMessage.userName}</strong></span>
                         <span className="text-slate-500 truncate max-w-[200px]">"{replyingToMessage.content}"</span>
                      </div>
                      <button onClick={() => setReplyingToMessageId(null)} className="text-slate-500 hover:text-white">
                         <X size={14} />
                      </button>
                   </div>
                )}
                <form onSubmit={handleSendMessageSubmit} className="relative">
                   <input 
                     type="text" 
                     value={chatInput}
                     onChange={(e) => {
                        setChatInput(e.target.value);
                        if (e.target.value.trim()) {
                            onUserTyping(selectedGroup.id);
                        }
                     }}
                     placeholder="Type a message..."
                     className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                   />
                   <button 
                     type="submit"
                     disabled={!chatInput.trim()}
                     className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-lg transition-all disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-indigo-400"
                   >
                     <Send size={18} />
                   </button>
                </form>
             </div>
          </div>
        )}
        {isShareModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white">Share a Plan</h3>
                  <button onClick={() => setIsShareModalOpen(false)} className="text-slate-500 hover:text-white"><X size={20}/></button>
                </div>
                <p className="text-sm text-slate-400 mb-4">Select one of your saved plans to post to <strong>{selectedGroup.name}</strong>.</p>
                
                <div className="max-h-[300px] overflow-y-auto space-y-2 mb-4 pr-1">
                   {userPlans.length === 0 && <p className="text-center text-slate-500 py-4">You have no saved plans yet.</p>}
                   {userPlans.map(plan => (
                     <div 
                       key={plan.id} 
                       onClick={() => handleShareSubmit(plan)}
                       className="p-3 rounded-lg bg-slate-800 border border-slate-700 hover:border-indigo-500 hover:bg-slate-700 cursor-pointer transition-all"
                     >
                       <div className="font-medium text-white text-sm">{plan.title}</div>
                       <div className="text-xs text-slate-500 mt-1">{new Date(plan.createdAt).toLocaleDateString()}</div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}
        {isCreatePollOpen && (
           <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white">Create Poll</h3>
                  <button onClick={() => setIsCreatePollOpen(false)} className="text-slate-500 hover:text-white"><X size={20}/></button>
                </div>
                
                <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-medium text-slate-300 mb-1">Question</label>
                     <input 
                       type="text" 
                       value={pollQuestion}
                       onChange={(e) => setPollQuestion(e.target.value)}
                       className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                       placeholder="e.g. When should we meet?"
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-slate-300 mb-1">Options</label>
                     <div className="space-y-2">
                        {pollOptions.map((opt, idx) => (
                           <div key={idx} className="flex gap-2">
                              <input 
                                 type="text"
                                 value={opt}
                                 onChange={(e) => {
                                    const newOpts = [...pollOptions];
                                    newOpts[idx] = e.target.value;
                                    setPollOptions(newOpts);
                                 }}
                                 placeholder={`Option ${idx + 1}`}
                                 className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                              />
                              {pollOptions.length > 2 && (
                                 <button 
                                    onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                                    className="p-2 text-slate-500 hover:text-red-400"
                                 >
                                    <X size={16} />
                                 </button>
                              )}
                           </div>
                        ))}
                        <button 
                           onClick={() => setPollOptions([...pollOptions, ''])}
                           className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                        >
                           <Plus size={12} /> Add Option
                        </button>
                     </div>
                   </div>
                </div>

                <button 
                  onClick={handleCreatePollSubmit}
                  disabled={!pollQuestion || pollOptions.some(o => !o.trim())}
                  className="w-full mt-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-semibold transition-colors"
                >
                  Post Poll
                </button>
             </div>
           </div>
        )}
        {isAddMemberModalOpen && (
           <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white">Invite Friend</h3>
                  <button onClick={() => setIsAddMemberModalOpen(false)} className="text-slate-500 hover:text-white"><X size={20}/></button>
                </div>
                <p className="text-sm text-slate-400 mb-4">Select a friend from your leaderboard to add to this group.</p>

                <div className="max-h-[300px] overflow-y-auto space-y-2">
                   {friends.filter(f => !selectedGroup.members.some(m => m.userId === f.id)).length === 0 ? (
                      <p className="text-center text-slate-500 py-4 text-sm">
                         No friends available to add. <br/>
                         <span className="text-xs">Add friends in the Leaderboard tab first!</span>
                      </p>
                   ) : (
                     friends
                       .filter(f => !selectedGroup.members.some(m => m.userId === f.id))
                       .map(friend => (
                         <div 
                           key={friend.id} 
                           onClick={() => handleAddMemberSubmit(friend)}
                           className="flex items-center gap-3 p-3 rounded-lg bg-slate-800 border border-slate-700 hover:border-emerald-500 hover:bg-slate-700 cursor-pointer transition-all"
                         >
                           <img src={friend.avatar} alt={friend.name} className="w-8 h-8 rounded-full bg-slate-900" />
                           <div className="flex-1">
                             <div className="font-medium text-white text-sm">{friend.name}</div>
                             <div className="text-xs text-slate-500">ID: {friend.id}</div>
                           </div>
                           <div className="text-emerald-500 opacity-0 group-hover:opacity-100">
                              <Plus size={16} />
                           </div>
                         </div>
                       ))
                   )}
                </div>
             </div>
           </div>
        )}
        {isAddResourceModalOpen && (
           <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white">Add Material</h3>
                  <button onClick={() => setIsAddResourceModalOpen(false)} className="text-slate-500 hover:text-white"><X size={20}/></button>
                </div>
                
                <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
                     <input 
                       type="text" 
                       value={resTitle}
                       onChange={(e) => setResTitle(e.target.value)}
                       className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                       placeholder="e.g. Calculus Notes"
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-slate-300 mb-1">Type</label>
                     <div className="flex gap-2">
                       {(['link', 'file', 'image'] as const).map(t => (
                          <button
                            key={t}
                            onClick={() => setResType(t)}
                            className={`flex-1 py-2 rounded-lg border text-sm capitalize ${resType === t ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'border-slate-700 text-slate-400'}`}
                          >
                            {t}
                          </button>
                       ))}
                     </div>
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-slate-300 mb-1">URL (or YouTube Link)</label>
                     <input 
                       type="text" 
                       value={resUrl}
                       onChange={(e) => setResUrl(e.target.value)}
                       className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                       placeholder={resType === 'link' ? "https://youtube.com/..." : "File URL..."}
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                     <textarea 
                       value={resDesc}
                       onChange={(e) => setResDesc(e.target.value)}
                       className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 h-20 resize-none"
                     />
                   </div>
                </div>

                <div className="mt-6">
                  <button 
                    onClick={handleResourceSubmit}
                    disabled={!resTitle || !resUrl}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-semibold transition-colors"
                  >
                    Share Material
                  </button>
                </div>
             </div>
           </div>
        )}

      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="text-indigo-400" /> Study Groups
          </h1>
          <p className="text-slate-400">Collaborate, share plans, and learn together.</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-colors"
        >
          <Plus size={18} /> Create Group
        </button>
      </div>

      <div className="flex gap-6 border-b border-slate-800 mb-6">
        <button 
          onClick={() => setActiveTab('my-groups')}
          className={`pb-3 text-sm font-medium transition-all relative ${activeTab === 'my-groups' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
        >
          My Groups
          {activeTab === 'my-groups' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full"></span>}
        </button>
        <button 
          onClick={() => setActiveTab('explore')}
          className={`pb-3 text-sm font-medium transition-all relative ${activeTab === 'explore' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
        >
          Explore Communities
          {activeTab === 'explore' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full"></span>}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTab === 'my-groups' ? (
          myGroups.length > 0 ? (
             myGroups.map(g => renderGroupCard(g, true))
          ) : (
            <div className="col-span-full py-12 text-center border border-dashed border-slate-800 rounded-xl">
               <p className="text-slate-500 mb-2">You haven't joined any groups yet.</p>
               <button onClick={() => setActiveTab('explore')} className="text-indigo-400 hover:underline text-sm">Explore Public Groups</button>
            </div>
          )
        ) : (
          publicGroups.length > 0 ? (
            publicGroups.map(g => renderGroupCard(g, false))
          ) : (
            <div className="col-span-full py-12 text-center text-slate-500">No other public groups found. Create one!</div>
          )
        )}
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-lg font-bold text-white">Create Study Group</h3>
                 <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-500 hover:text-white"><X size={20}/></button>
              </div>
              
              <div className="space-y-4 mb-6">
                 <div>
                   <label className="block text-sm font-medium text-slate-300 mb-1">Group Name</label>
                   <input 
                     type="text" 
                     value={newGroupName}
                     onChange={(e) => setNewGroupName(e.target.value)}
                     className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                     placeholder="e.g. Physics 101 Buddies"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                   <textarea 
                     value={newGroupDesc}
                     onChange={(e) => setNewGroupDesc(e.target.value)}
                     className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none h-24 resize-none"
                     placeholder="What is this group about?"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-slate-300 mb-2">Privacy</label>
                   <div className="flex gap-3">
                      <button 
                        onClick={() => setNewGroupPrivacy('public')}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 ${newGroupPrivacy === 'public' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                      >
                        <Globe size={16} /> Public
                      </button>
                      <button 
                        onClick={() => setNewGroupPrivacy('private')}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 ${newGroupPrivacy === 'private' ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                      >
                        <Lock size={16} /> Private
                      </button>
                   </div>
                 </div>
              </div>

              <button 
                onClick={handleCreateSubmit}
                disabled={!newGroupName.trim()}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-semibold transition-colors"
              >
                Create Group
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

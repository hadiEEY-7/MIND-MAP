
import React, { useState, useEffect, useRef } from 'react';
import { SubjectInput, PlanPreferences, LoadingState, GeneratedPlan, StudySession, FocusHistoryEntry, SavedPlan, AppView, UserProfile, StudyGroup, GroupMember, SharedPlanItem, GroupPrivacy, LeaderboardEntry, GroupMessage, GroupResource, SessionStatus, GroupPoll, FriendRequest } from './types';
import { generateStudyPlan, parseSyllabusImage, suggestVideoResources, rescheduleStudyPlan, generateICS, summarizeGroupChat, generateBotReply, generateBotTopic, generateBotStudyTip } from './services/geminiService';
import { SubjectCard } from './components/SubjectCard';
import { PlanView } from './components/PlanView';
import { FocusTimer } from './components/FocusTimer';
import { HistoryModal } from './components/HistoryModal';
import { Dashboard } from './components/Dashboard';
import { Leaderboard } from './components/Leaderboard';
import { ProfileModal } from './components/ProfileModal';
import { GroupsView } from './components/GroupsView';
import { Plus, Sparkles, Loader2, BookOpen, AlertTriangle, Zap, History, ArrowLeft, LayoutDashboard, Pin, Heart, Trophy, User, Users, Camera, Upload } from 'lucide-react';

// --- MOCK DATA GENERATORS ---

const EXTRA_NAMES = ["Liam", "Olivia", "Noah", "Emma", "Oliver", "Ava", "Elijah", "Charlotte", "William", "Sophia", "James", "Amelia", "Benjamin", "Isabella", "Lucas", "Mia", "Henry", "Evelyn", "Alexander", "Harper", "Michael", "Ella", "Daniel", "Avery", "Matthew", "Scarlett", "Jackson", "Grace"];

const generateNewMember = (): GroupMember => {
  const name = EXTRA_NAMES[Math.floor(Math.random() * EXTRA_NAMES.length)] + " " + String.fromCharCode(65 + Math.floor(Math.random() * 26)) + ".";
  const id = `u-${Math.random().toString(36).substr(2, 9)}`;
  return {
    userId: id,
    name: name,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
    role: 'member',
    joinedAt: new Date().toISOString(),
    activeStatus: { isOnline: true, currentFocus: 'General Review', startedAt: new Date().toISOString() }
  };
};

const getContextualReply = (groupName: string, lastMessage?: string): string => {
  const lowerName = groupName.toLowerCase();
  const lowerMsg = lastMessage?.toLowerCase() || "";

  // 1. Direct Reply to User Message
  if (lastMessage) {
     if (lowerMsg.includes("hello") || lowerMsg.includes("hi") || lowerMsg.includes("hey") || lowerMsg.includes("joined")) {
        return `Welcome! Glad to have you in ${groupName}.`;
     }
     if (lowerMsg.includes("help") || lowerMsg.includes("stuck")) {
        return "What specifically are you stuck on? Maybe we can screen share.";
     }
     if (lowerMsg.includes("tired") || lowerMsg.includes("break") || lowerMsg.includes("sleep")) {
        return "Take a 15m power nap, honestly saves my life.";
     }
     if (lowerMsg.includes("thanks") || lowerMsg.includes("thx")) {
        return "No problem! We're all in this together.";
     }
     if (lowerMsg.includes("lol") || lowerMsg.includes("haha")) {
        return "😂";
     }
  }

  // 2. Contextual Subject Chatter
  if (lowerName.includes("math") || lowerName.includes("calc") || lowerName.includes("algebra") || lowerName.includes("stat")) {
     const mathReplies = [
       "The integration questions in Chapter 4 are brutal.",
       "Just remember the chain rule!",
       "Anyone have a good cheat sheet for the formulas?",
       "Math is just pattern recognition, keep practicing.",
       "I finally understand limits! (I think)",
       "My brain hurts from this problem set.",
       "Does anyone want to race through a practice exam?"
     ];
     return mathReplies[Math.floor(Math.random() * mathReplies.length)];
  }
  
  if (lowerName.includes("physics") || lowerName.includes("chem") || lowerName.includes("bio") || lowerName.includes("science") || lowerName.includes("stem")) {
     const scienceReplies = [
       "Lab reports are due tomorrow, don't forget.",
       "Physics is basically just applied math if you think about it.",
       "Memorizing these periodic table elements is pain.",
       "Mitochondria is the powerhouse of the cell 🦠",
       "I need help with the thermodynamics section.",
       "This reaction mechanism makes no sense.",
       "Anyone studying for the MCAT?"
     ];
     return scienceReplies[Math.floor(Math.random() * scienceReplies.length)];
  }

  if (lowerName.includes("history") || lowerName.includes("art") || lowerName.includes("english") || lowerName.includes("law")) {
     const humanitiesReplies = [
       "So much reading to do...",
       "I need to write 500 words by tonight.",
       "History is actually super interesting once you get into it.",
       "Can someone proofread my essay intro?",
       "Dates are hard to remember, I use flashcards.",
       "Anyone analyzing Shakespeare right now?"
     ];
     return humanitiesReplies[Math.floor(Math.random() * humanitiesReplies.length)];
  }

  if (lowerName.includes("code") || lowerName.includes("comp") || lowerName.includes("dev")) {
      const codeReplies = [
        "It works on my machine 🤷‍♂️",
        "Debugging is 90% of the work.",
        "Why is this CSS not centering??",
        "Python is so much cleaner than Java.",
        "Did you push to GitHub?",
        "I think you missed a semicolon."
      ];
      return codeReplies[Math.floor(Math.random() * codeReplies.length)];
   }

  // 3. General Study Chatter
  const generics = [
    "Keep pushing everyone!",
    "Focus mode is on 😤",
    "Has anyone tried the Pomodoro timer feature here? It's good.",
    "I'm studying for 2 more hours then sleeping.",
    "Let's get this bread 🍞",
    "Coffee time ☕️",
    "My playlist is fire right now.",
    "Just finished a topic, feeling good."
  ];
  return generics[Math.floor(Math.random() * generics.length)];
};

const MOCK_POLLS_DATA = [
  { q: "Best time to study?", o: ["Morning 🌅", "Afternoon ☀️", "Night owl 🦉"] },
  { q: "Hardest subject?", o: ["Calculus", "Physics", "Chemistry", "History"] },
  { q: "Preferred Pomodoro?", o: ["25/5", "50/10", "90/20"] },
  { q: "Fuel of choice?", o: ["Coffee ☕", "Tea 🍵", "Water 💧", "Energy Drink ⚡"] }
];

function App() {
  // --- Global App State ---
  const [view, setView] = useState<AppView>('dashboard');
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [friends, setFriends] = useState<LeaderboardEntry[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});

  // --- User Profile State ---
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: `MIND-${Math.floor(1000 + Math.random() * 9000)}`, // Generate random default ID
    name: 'Student',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    region: 'North America'
  });
  const [showProfileModal, setShowProfileModal] = useState(false);

  // --- Inputs State (Wizard) ---
  const [subjects, setSubjects] = useState<SubjectInput[]>([
    { 
      id: '1', 
      name: 'Advanced Calculus', 
      difficulty: 8, 
      examDate: '2025-06-15', 
      currentConfidence: 40, 
      isHighPriority: true,
      chapters: [] 
    }
  ]);

  const [preferences, setPreferences] = useState<PlanPreferences>({
    dailyAvailableHours: 4,
    startDate: new Date().toISOString().split('T')[0]
  });

  // --- Generation State ---
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // --- Focus Mode State ---
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  const [totalMinutesStudied, setTotalMinutesStudied] = useState(0);
  
  // --- History State ---
  const [history, setHistory] = useState<FocusHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Hidden file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Typing Timeout Ref
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Persistence Logic ---
  const seedInitialGroups = () => {
       // Create initial members using our generator
       const seedMembers = Array(4).fill(null).map(generateNewMember);

       const seedGroups: StudyGroup[] = [
         {
           id: 'g-global',
           name: 'Global Study Hub',
           description: 'A public community for students worldwide to share tips and plans.',
           privacy: 'public',
           members: seedMembers,
           sharedPlans: [],
           messages: [],
           resources: [],
           polls: [],
           createdBy: 'system',
           createdAt: new Date().toISOString()
         },
         {
            id: 'g-stem',
            name: 'STEM Majors United',
            description: 'Calculus, Physics, Engineering. Share your toughest schedules.',
            privacy: 'public',
            members: seedMembers.slice(0, 3), // Vary members slightly
            sharedPlans: [],
            messages: [],
            resources: [],
            polls: [],
            createdBy: 'system',
            createdAt: new Date().toISOString()
         }
       ];
       setGroups(seedGroups);
  };

  useEffect(() => {
    const savedState = localStorage.getItem('mindmap_state_v1');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.minutes) setTotalMinutesStudied(parsed.minutes);
        if (parsed.plans) setSavedPlans(parsed.plans);
        if (parsed.history) setHistory(parsed.history);
        if (parsed.userProfile) setUserProfile(parsed.userProfile);
        if (parsed.friends) setFriends(parsed.friends);
        if (parsed.friendRequests) setFriendRequests(parsed.friendRequests);
        
        // Load groups or set defaults
        if (parsed.groups && parsed.groups.length > 0) {
           setGroups(parsed.groups);
        } else {
           seedInitialGroups();
        }

      } catch (e) {
        console.error("Failed to load saved state", e);
        seedInitialGroups();
      }
    } else {
       seedInitialGroups();
    }
  }, []);

  // --- SIMULATE LIVE ROOM UPDATES ---
  useEffect(() => {
     const interval = setInterval(() => {
        setGroups(currentGroups => {
           return currentGroups.map(group => {
             if (Math.random() > 0.4) { // Update 60% of groups
                const updatedMembers = group.members.map(member => {
                   // Skip current user (managed by actual focus timer)
                   if (member.userId === userProfile.id) return member;
                   
                   // Logic to simulate realistic activity
                   const wasOnline = member.activeStatus?.isOnline;
                   const shouldBeOnline = wasOnline ? Math.random() > 0.3 : Math.random() > 0.7; // Stay online longer

                   if (shouldBeOnline) {
                       const subjects = ["Calculus", "Physics", "History", "Coding", "Literature", "Biology", "Chemistry", "Economics"];
                       // Keep current focus if staying online, else pick new
                       const topic = (wasOnline && member.activeStatus?.currentFocus) 
                          ? member.activeStatus.currentFocus 
                          : subjects[Math.floor(Math.random() * subjects.length)];
                       
                       return {
                          ...member,
                          activeStatus: {
                             isOnline: true,
                             currentFocus: topic,
                             startedAt: member.activeStatus?.startedAt || new Date().toISOString()
                          }
                       };
                   } else {
                       return { ...member, activeStatus: undefined };
                   }
                });
                return { ...group, members: updatedMembers };
             }
             return group;
           });
        });
     }, 8000); 

     return () => clearInterval(interval);
  }, [userProfile.id]);

  // Helper to start simulated typing
  const simulateBotTyping = (groupId: string, botName: string, durationMs: number) => {
      setTypingUsers(prev => ({
         ...prev,
         [groupId]: [...(prev[groupId] || []), botName]
      }));

      setTimeout(() => {
         setTypingUsers(prev => ({
             ...prev,
             [groupId]: (prev[groupId] || []).filter(n => n !== botName)
         }));
      }, durationMs);
  };

  const handleUserTyping = (groupId: string) => {
    // Add user to state if not already present
    setTypingUsers(prev => {
        const groupTypers = prev[groupId] || [];
        if (groupTypers.includes(userProfile.name)) return prev;
        return { ...prev, [groupId]: [...groupTypers, userProfile.name] };
    });

    // Clear existing timeout to debounce
    if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to remove user after inactivity
    typingTimeoutRef.current = setTimeout(() => {
        setTypingUsers(prev => {
            const groupTypers = prev[groupId] || [];
            return { ...prev, [groupId]: groupTypers.filter(n => n !== userProfile.name) };
        });
    }, 3000); // 3 seconds inactivity
  };

  // Helper to insert message after delay
  const insertBotMessage = (groupId: string, bot: GroupMember, content: string, delayMs: number, replyTo?: any) => {
     const typingDuration = Math.min(3000, Math.max(1000, content.length * 40)); // Dynamic typing speed
     
     // Wait for reading/thinking time
     setTimeout(() => {
        // Start Typing Indicator
        simulateBotTyping(groupId, bot.name, typingDuration);
        
        // Wait for typing time then post
        setTimeout(() => {
             setGroups(currentGroups => currentGroups.map(g => {
                if (g.id === groupId) {
                   const msg: GroupMessage = {
                      id: Math.random().toString(36).substr(2, 9),
                      userId: bot.userId,
                      userName: bot.name,
                      userAvatar: bot.avatar,
                      content: content,
                      timestamp: new Date().toISOString(),
                      readBy: [bot.userId],
                      replyTo: replyTo
                   };
                   return { ...g, messages: [...(g.messages || []), msg].slice(-100) };
                }
                return g;
             }));
        }, typingDuration);

     }, delayMs);
  };

  // --- SIMULATE MOCK CHAT & FRIEND REQUESTS ---
  useEffect(() => {
    const simulationInterval = setInterval(async () => {
       // 0. INCOMING FRIEND REQUESTS (Simulated)
       if (Math.random() < 0.05 && friendRequests.length < 5) { // 5% chance per tick, max 5 pending
          const mockName = EXTRA_NAMES[Math.floor(Math.random() * EXTRA_NAMES.length)];
          const mockId = `MIND-${Math.floor(1000 + Math.random() * 9000)}`;
          const alreadyFriend = friends.some(f => f.id === mockId);
          const pending = friendRequests.some(r => r.fromUser.id === mockId);
          
          if (!alreadyFriend && !pending) {
             const newRequest: FriendRequest = {
                id: `req-${Math.random().toString(36).substr(2, 9)}`,
                fromUser: {
                   id: mockId,
                   name: mockName,
                   avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${mockName}`,
                   region: ['North America', 'Europe', 'Asia'][Math.floor(Math.random() * 3)]
                },
                timestamp: new Date().toISOString(),
                status: 'pending'
             };
             setFriendRequests(prev => [newRequest, ...prev]);
          }
       }

       setGroups(currentGroups => {
          return currentGroups.map(group => {
             if (group.privacy !== 'public') return group;
             
             // 1. NEW MEMBERS (Small chance)
             if (Math.random() < 0.05) { 
                const newMember = generateNewMember();
                if (!group.members.some(m => m.userId === newMember.userId)) {
                   return { 
                       ...group, 
                       members: [...group.members, newMember],
                       messages: [...(group.messages || []), {
                          id: Math.random().toString(36).substr(2, 9),
                          userId: newMember.userId,
                          userName: newMember.name,
                          userAvatar: newMember.avatar,
                          content: `Hey everyone! Just joined to study ${group.name.split(' ')[0]} with you all.`,
                          timestamp: new Date().toISOString(),
                          readBy: [newMember.userId]
                       }]
                   };
                }
             }
             
             // Identify mock members
             const mockMembers = group.members.filter(m => m.userId !== userProfile.id);
             if (mockMembers.length === 0) return group;

             // 2. POLL VOTING (Bots participate in polls)
             if (group.polls && group.polls.length > 0 && Math.random() < 0.3) {
                const activePolls = group.polls.filter(p => p.isActive);
                if (activePolls.length > 0) {
                   const poll = activePolls[Math.floor(Math.random() * activePolls.length)];
                   const voter = mockMembers[Math.floor(Math.random() * mockMembers.length)];
                   
                   // Check if already voted
                   const hasVoted = poll.options.some(opt => opt.votes.includes(voter.userId));
                   if (!hasVoted) {
                      const randomOption = poll.options[Math.floor(Math.random() * poll.options.length)];
                      const updatedPolls = group.polls.map(p => {
                         if (p.id === poll.id) {
                            const updatedOptions = p.options.map(opt => {
                               if (opt.id === randomOption.id) {
                                  return { ...opt, votes: [...opt.votes, voter.userId] };
                               }
                               return opt;
                            });
                            return { ...p, options: updatedOptions };
                         }
                         return p;
                      });
                      // Return updated group immediately for voting
                      return { ...group, polls: updatedPolls };
                   }
                }
             }

             // 3. CHAT ACTIVITY
             const lastMsg = group.messages && group.messages.length > 0 ? group.messages[group.messages.length - 1] : null;
             const lastWasMe = lastMsg?.userId === userProfile.id;
             const chatThreshold = lastWasMe ? 0.0 : 0.85; // Very low chance if not triggered by user

             const r = Math.random();
             if (r > chatThreshold) {
                const speaker = mockMembers[Math.floor(Math.random() * mockMembers.length)];
                
                // Decide Interaction Type
                const interactionRoll = Math.random();

                // A. AI Topic (25%)
                if (interactionRoll < 0.25) {
                   generateBotTopic(group.name, speaker.name).then(aiContent => {
                      if (aiContent) {
                         insertBotMessage(group.id, speaker, aiContent, 1000);
                      }
                   });
                } 
                // B. AI Study Tip (10%)
                else if (interactionRoll < 0.35) {
                   generateBotStudyTip(group.name, speaker.name).then(aiTip => {
                      if (aiTip) {
                         insertBotMessage(group.id, speaker, "💡 " + aiTip, 1500);
                      }
                   });
                }
                // C. Poll Creation (5%)
                else if (interactionRoll < 0.40) {
                    const pollData = MOCK_POLLS_DATA[Math.floor(Math.random() * MOCK_POLLS_DATA.length)];
                    // Only create if not exists
                    if (!group.polls?.some(p => p.question === pollData.q)) {
                        const newPoll: GroupPoll = {
                            id: Math.random().toString(36).substr(2, 9),
                            question: pollData.q,
                            options: pollData.o.map(opt => ({ id: Math.random().toString(36).substr(2, 9), text: opt, votes: [] })),
                            createdBy: speaker.userId,
                            createdAt: new Date().toISOString(),
                            isActive: true
                        };
                        // Sync update
                        return {
                           ...group,
                           polls: [...(group.polls || []), newPoll],
                           messages: [...(group.messages || []), {
                              id: Math.random().toString(36).substr(2, 9),
                              userId: speaker.userId,
                              userName: speaker.name,
                              userAvatar: speaker.avatar,
                              content: "Started a poll",
                              timestamp: new Date().toISOString(),
                              pollId: newPoll.id,
                              readBy: [speaker.userId]
                           }]
                        };
                    }
                }
                // D. Generic/Static (Fallback)
                else {
                   const content = getContextualReply(group.name);
                   insertBotMessage(group.id, speaker, content, 2000); 
                }
             }

             // 4. REACTION ACTIVITY
             if (Math.random() < 0.3 && group.messages.length > 0) {
                const recentMsgs = group.messages.slice(-8);
                const targetMsg = recentMsgs[Math.floor(Math.random() * recentMsgs.length)];
                const reactor = mockMembers[Math.floor(Math.random() * mockMembers.length)];
                
                if (reactor.userId !== targetMsg.userId) {
                    return {
                        ...group,
                        messages: group.messages.map(m => {
                           if (m.id === targetMsg.id) {
                              const emojis = ['👍', '❤️', '🔥', '😂', '💯'];
                              const emoji = emojis[Math.floor(Math.random() * emojis.length)];
                              const existingReactions = m.reactions || [];
                              const reactionIdx = existingReactions.findIndex(rx => rx.emoji === emoji);
                              let newReactions = [...existingReactions];
                              if (reactionIdx > -1) {
                                 if (!newReactions[reactionIdx].userIds.includes(reactor.userId)) {
                                    newReactions[reactionIdx] = {
                                       ...newReactions[reactionIdx],
                                       userIds: [...newReactions[reactionIdx].userIds, reactor.userId]
                                    };
                                 }
                              } else {
                                 newReactions.push({ emoji, userIds: [reactor.userId] });
                              }
                              return { ...m, reactions: newReactions };
                           }
                           return m;
                        })
                    };
                }
             }

             return group;
          });
       });
    }, 5000); 

    return () => clearInterval(simulationInterval);
  }, [userProfile.id, friends.length, friendRequests.length]); 

  useEffect(() => {
    const stateToSave = {
      minutes: totalMinutesStudied,
      plans: savedPlans,
      history: history,
      userProfile: userProfile,
      groups: groups,
      friends: friends,
      friendRequests: friendRequests
    };
    localStorage.setItem('mindmap_state_v1', JSON.stringify(stateToSave));
  }, [totalMinutesStudied, savedPlans, history, userProfile, groups, friends, friendRequests]);


  // --- Plan Management Actions ---

  const handleCreateNew = () => {
    setSubjects([{ 
      id: Math.random().toString(36).substr(2, 9), 
      name: '', 
      difficulty: 5, 
      examDate: '', 
      currentConfidence: 50, 
      isHighPriority: false,
      chapters: [] 
    }]);
    setLoadingState('idle');
    setError(null);
    setView('wizard');
  };

  const handleOpenPlan = (plan: SavedPlan) => {
    setSubjects(plan.originalSubjects);
    setPreferences(plan.originalPreferences);
    setCurrentPlanId(plan.id);
    setView('plan');
  };

  const handleTogglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedPlans(prev => prev.map(p => p.id === id ? { ...p, isPinned: !p.isPinned } : p));
  };

  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedPlans(prev => prev.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p));
  };

  const handleDeletePlan = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this plan?")) {
      setSavedPlans(prev => prev.filter(p => p.id !== id));
    }
  };

  // --- Wizard Actions ---

  const handleAddSubject = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    setSubjects([...subjects, { 
      id: newId, 
      name: '', 
      difficulty: 5, 
      examDate: '', 
      currentConfidence: 50, 
      isHighPriority: false,
      chapters: [] 
    }]);
  };

  const handleRemoveSubject = (id: string) => {
    setSubjects(subjects.filter(s => s.id !== id));
  };

  const handleSubjectChange = (id: string, field: keyof SubjectInput, value: any) => {
    setSubjects(subjects.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoadingState('analyzing_image');
    setError(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        try {
          const extractedSubjects = await parseSyllabusImage(base64String);
          if (extractedSubjects.length > 0) {
             let currentSubjects = [...subjects];
             if (currentSubjects.length === 1 && !currentSubjects[0].name && !currentSubjects[0].examDate) {
               currentSubjects = [];
             }
             setSubjects([...currentSubjects, ...extractedSubjects]);
             setLoadingState('idle');
          } else {
             setError("Could not identify any subjects in the image. Please try a clearer photo.");
             setLoadingState('idle');
          }
        } catch (err) {
          console.error(err);
          setError("Failed to analyze image. Please try again.");
          setLoadingState('idle');
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setError("Error reading file.");
      setLoadingState('idle');
    }
  };

  const handleGenerate = async () => {
    const invalidSubjects = subjects.filter(s => !s.name || !s.examDate);
    if (invalidSubjects.length > 0) {
      setError("Please fill in Name and Exam Date for all subjects.");
      return;
    }
    if (subjects.length === 0) {
      setError("Please add at least one subject.");
      return;
    }

    setError(null);
    setLoadingState('thinking');
    
    try {
      const result = await generateStudyPlan(subjects, preferences);
      const processedSchedule = result.schedule.map(day => ({
        ...day,
        sessions: day.sessions.map(s => ({
          ...s,
          id: Math.random().toString(36).substr(2, 9),
          status: 'pending' as SessionStatus
        }))
      }));

      const processedResult = { ...result, schedule: processedSchedule };
      const newPlan: SavedPlan = {
        id: Math.random().toString(36).substr(2, 9),
        title: `Plan: ${subjects.map(s => s.name).slice(0, 2).join(', ')}${subjects.length > 2 ? '...' : ''}`,
        createdAt: new Date().toISOString(),
        isPinned: false,
        isFavorite: false,
        data: processedResult,
        originalSubjects: [...subjects], 
        originalPreferences: { ...preferences }
      };

      setSavedPlans(prev => [newPlan, ...prev]);
      setCurrentPlanId(newPlan.id);
      setLoadingState('complete');
      setView('plan');

    } catch (err) {
      setLoadingState('error');
      setError("Failed to generate plan. Please check your API Key or try again.");
    }
  };

  const handleUpdateSessionStatus = (date: string, sessionId: string, status: SessionStatus) => {
    setSavedPlans(plans => plans.map(p => {
      if (p.id === currentPlanId) {
        const updatedSchedule = p.data.schedule.map(day => {
          if (day.date === date) {
             return {
               ...day,
               sessions: day.sessions.map((s): StudySession => {
                 if (s.id === sessionId) {
                   return { ...s, status };
                 }
                 return s;
               })
             };
          }
          return day;
        });
        return { ...p, data: { ...p.data, schedule: updatedSchedule } };
      }
      return p;
    }));
  };

  const handleReschedule = async () => {
    const plan = savedPlans.find(p => p.id === currentPlanId);
    if (!plan) return;

    setLoadingState('rescheduling');
    try {
      const rescheduledData = await rescheduleStudyPlan(plan.originalSubjects, plan.originalPreferences, plan.data);
      const processedSchedule = rescheduledData.schedule.map(day => ({
        ...day,
        sessions: day.sessions.map(s => ({
          ...s,
          id: Math.random().toString(36).substr(2, 9),
          status: 'pending' as SessionStatus
        }))
      }));

      const processedResult = { ...rescheduledData, schedule: processedSchedule };
      setSavedPlans(plans => plans.map(p => 
        p.id === currentPlanId 
          ? { ...p, data: processedResult, title: p.title + " (Rescheduled)" } 
          : p
      ));
      setLoadingState('complete');
      alert("Plan has been smartly rescheduled based on your missed sessions!");
    } catch (e) {
      console.error(e);
      setError("Failed to reschedule.");
      setLoadingState('idle');
    }
  };

  const handleExportCalendar = () => {
    const plan = savedPlans.find(p => p.id === currentPlanId);
    if (plan) {
      generateICS(plan.data);
    }
  };

  // --- Focus Timer & Live Room Logic ---

  const updateLiveStatus = (isOnline: boolean, focusTopic?: string) => {
      setGroups(currentGroups => 
         currentGroups.map(group => {
            if (group.members.some(m => m.userId === userProfile.id)) {
               return {
                  ...group,
                  members: group.members.map(m => {
                     if (m.userId === userProfile.id) {
                        return {
                           ...m,
                           activeStatus: isOnline ? {
                              isOnline: true,
                              currentFocus: focusTopic,
                              startedAt: new Date().toISOString()
                           } : undefined
                        };
                     }
                     return m;
                  })
               };
            }
            return group;
         })
      );
  };

  const handleStartSession = (session: StudySession) => {
    setActiveSession(session);
    updateLiveStatus(true, session.subjectName);
  };

  const handleCloseSession = () => {
     setActiveSession(null);
     updateLiveStatus(false);
  };

  const handleSessionComplete = (minutes: number) => {
    if (minutes > 0 && activeSession) {
      setTotalMinutesStudied(prev => prev + minutes);
      if (currentPlanId && activeSession.id) {
         setSavedPlans(plans => plans.map(p => {
            if (p.id === currentPlanId) {
               const updatedSchedule = p.data.schedule.map(day => ({
                  ...day,
                  sessions: day.sessions.map((s): StudySession => s.id === activeSession.id ? { ...s, status: 'completed' } : s)
               }));
               return { ...p, data: { ...p.data, schedule: updatedSchedule } };
            }
            return p;
         }));
      }
      const newEntry: FocusHistoryEntry = {
        id: Math.random().toString(36).substr(2, 9),
        subjectName: activeSession.subjectName,
        focusTopic: activeSession.focusTopic,
        durationMinutes: minutes,
        completedAt: new Date().toISOString()
      };
      setHistory(prev => [...prev, newEntry]);
    }
    updateLiveStatus(false);
  };

  // --- Group Actions ---

  const handleCreateGroup = (name: string, description: string, privacy: GroupPrivacy) => {
    const newGroup: StudyGroup = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      description,
      privacy,
      members: [{
        userId: userProfile.id,
        name: userProfile.name,
        avatar: userProfile.avatar,
        role: 'admin', 
        joinedAt: new Date().toISOString()
      }],
      sharedPlans: [],
      messages: [],
      resources: [],
      polls: [],
      createdBy: userProfile.id,
      createdAt: new Date().toISOString()
    };
    setGroups([...groups, newGroup]);
  };

  const handleJoinGroup = (groupId: string) => {
    setGroups(groups.map(g => {
      if (g.id === groupId) {
        if (g.members.some(m => m.userId === userProfile.id)) return g;
        return {
          ...g,
          members: [...g.members, {
            userId: userProfile.id,
            name: userProfile.name,
            avatar: userProfile.avatar,
            role: 'member', 
            joinedAt: new Date().toISOString()
          }]
        };
      }
      return g;
    }));
  };

  const handleSharePlan = (groupId: string, plan: SavedPlan) => {
    setGroups(groups.map(g => {
      if (g.id === groupId) {
        const sharedItem: SharedPlanItem = {
          id: Math.random().toString(36).substr(2, 9),
          originalPlanId: plan.id,
          planTitle: plan.title,
          planOverview: plan.data.overview,
          sharedBy: {
            userId: userProfile.id,
            name: userProfile.name,
            avatar: userProfile.avatar
          },
          sharedAt: new Date().toISOString(),
          planData: plan.data,
          originalSubjects: plan.originalSubjects,
          originalPreferences: plan.originalPreferences,
          likes: 0,
          clones: 0
        };
        return { ...g, sharedPlans: [...g.sharedPlans, sharedItem] };
      }
      return g;
    }));
  };

  const handleClonePlan = (sharedPlan: SharedPlanItem) => {
    const newPersonalPlan: SavedPlan = {
      id: Math.random().toString(36).substr(2, 9),
      title: `Clone: ${sharedPlan.planTitle}`,
      createdAt: new Date().toISOString(),
      isPinned: false,
      isFavorite: false,
      data: sharedPlan.planData,
      originalSubjects: sharedPlan.originalSubjects,
      originalPreferences: sharedPlan.originalPreferences
    };
    
    setSavedPlans([newPersonalPlan, ...savedPlans]);
    alert("Plan saved to your dashboard!");
  };

  const handleAddMemberToGroup = (groupId: string, friend: LeaderboardEntry) => {
    setGroups(groups.map(g => {
      if (g.id === groupId) {
         if (g.members.some(m => m.userId === friend.id)) return g;
         const newMember: GroupMember = {
           userId: friend.id,
           name: friend.name,
           avatar: friend.avatar,
           role: 'member', 
           joinedAt: new Date().toISOString()
         };
         return { ...g, members: [...g.members, newMember] };
      }
      return g;
    }));
  };

  const handleSendMessage = (groupId: string, content: string, replyToMessageId?: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    let replyToData = undefined;
    if (replyToMessageId) {
       const parentMsg = group.messages?.find(m => m.id === replyToMessageId);
       if (parentMsg) {
          replyToData = {
             id: parentMsg.id,
             userName: parentMsg.userName,
             content: parentMsg.content
          };
       }
    }

    // 1. Add User's Message Immediately
    setGroups(currentGroups => currentGroups.map(g => {
      if (g.id === groupId) {
        const newMessage: GroupMessage = {
          id: Math.random().toString(36).substr(2, 9),
          userId: userProfile.id,
          userName: userProfile.name,
          userAvatar: userProfile.avatar,
          content,
          timestamp: new Date().toISOString(),
          reactions: [],
          readBy: [userProfile.id],
          replyTo: replyToData
        };
        return { ...g, messages: [...(g.messages || []), newMessage] };
      }
      return g;
    }));
    
    // Force stop typing indicator for user
    setTypingUsers(prev => {
        const groupTypers = prev[groupId] || [];
        return { ...prev, [groupId]: groupTypers.filter(n => n !== userProfile.name) };
    });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // 2. Trigger AI-Powered Bot Reply with Delays
    if (group.privacy === 'public') {
       const members = group.members.filter(m => m.userId !== userProfile.id);
       if (members.length === 0) return;
       
       let replier: GroupMember | undefined;

       // If replying to a specific user (bot), that bot MUST reply
       if (replyToData && replyToData.userName) {
          replier = members.find(m => m.name === replyToData.userName);
       }

       // If no specific reply or bot not found, random chance
       if (!replier) {
          replier = members[Math.floor(Math.random() * members.length)];
       }

       if (replier) {
          // Dynamic Reading Delay
          // Base 1.5s + 60ms per character + random 0-2s jitter
          const readingDelay = 1500 + (content.length * 60) + (Math.random() * 2000);
          const targetReplier = replier; // Capture closure

          setTimeout(async () => {
             // Generate Smart AI Reply
             let replyText = "";
             try {
                replyText = await generateBotReply(group.name, content, targetReplier.name);
             } catch (e) {
                replyText = getContextualReply(group.name, content);
             }

             if (!replyText) replyText = getContextualReply(group.name, content);

             // Insert with typing simulation
             // If user replied to bot, bot replies to user
             const botReplyTo = replyToData ? { id: "latest", userName: userProfile.name, content: content } : undefined;

             insertBotMessage(groupId, targetReplier, replyText, 0, botReplyTo); 
          }, readingDelay);
       }
    }
  };

  const handleMarkMessagesRead = (groupId: string, messageIds: string[]) => {
     if (messageIds.length === 0) return;
     setGroups(prevGroups => prevGroups.map(g => {
        if (g.id !== groupId) return g;
        const updatedMessages = g.messages.map(m => {
           if (messageIds.includes(m.id)) {
              const currentReadBy = m.readBy || [];
              if (!currentReadBy.includes(userProfile.id)) {
                 return { ...m, readBy: [...currentReadBy, userProfile.id] };
              }
           }
           return m;
        });
        return { ...g, messages: updatedMessages };
     }));
  };

  const handleToggleReaction = (groupId: string, messageId: string, emoji: string) => {
    setGroups(prevGroups => prevGroups.map(g => {
      if (g.id !== groupId) return g;
      const updatedMessages = g.messages.map(m => {
        if (m.id !== messageId) return m;
        const reactions = m.reactions || [];
        const existingReactionIndex = reactions.findIndex(r => r.emoji === emoji);
        let newReactions = [...reactions];
        if (existingReactionIndex > -1) {
           const existingReaction = newReactions[existingReactionIndex];
           if (existingReaction.userIds.includes(userProfile.id)) {
              const newUserIds = existingReaction.userIds.filter(uid => uid !== userProfile.id);
              if (newUserIds.length === 0) {
                 newReactions.splice(existingReactionIndex, 1);
              } else {
                 newReactions[existingReactionIndex] = { ...existingReaction, userIds: newUserIds };
              }
           } else {
              newReactions[existingReactionIndex] = { 
                 ...existingReaction, 
                 userIds: [...existingReaction.userIds, userProfile.id] 
              };
           }
        } else {
           newReactions.push({ emoji, userIds: [userProfile.id] });
        }
        return { ...m, reactions: newReactions };
      });
      return { ...g, messages: updatedMessages };
    }));
  };

  const handleAddResource = (groupId: string, resourceData: Omit<GroupResource, 'id' | 'addedBy' | 'addedAt'>) => {
     setGroups(groups.map(g => {
       if (g.id === groupId) {
         const newResource: GroupResource = {
           id: Math.random().toString(36).substr(2, 9),
           ...resourceData,
           addedBy: {
             userId: userProfile.id,
             name: userProfile.name,
             avatar: userProfile.avatar
           },
           addedAt: new Date().toISOString()
         };
         const currentResources = g.resources || [];
         return { ...g, resources: [...currentResources, newResource] };
       }
       return g;
     }));
  };

  const handleUpdateGroupVideo = (groupId: string, videoUrl: string | null, title: string = '', seekToSeconds: number = 0) => {
    setGroups(groups.map(g => {
        if (g.id === groupId) {
            const startedAt = videoUrl ? new Date(Date.now() - (seekToSeconds * 1000)).toISOString() : new Date().toISOString();
            return {
                ...g,
                activeVideo: videoUrl ? { url: videoUrl, title, startedAt } : null
            };
        }
        return g;
    }));
  };

  const handleToggleScreenShare = (groupId: string, isSharing: boolean) => {
    setGroups(groups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          activeScreenShare: isSharing ? {
            userId: userProfile.id,
            userName: userProfile.name
          } : null
        };
      }
      return g;
    }));
  };

  // --- Poll & Pin & Summary Actions ---

  const handleCreatePoll = (groupId: string, question: string, options: string[]) => {
    setGroups(groups.map(g => {
      if (g.id === groupId) {
        const newPoll: GroupPoll = {
          id: Math.random().toString(36).substr(2, 9),
          question,
          options: options.map(opt => ({
            id: Math.random().toString(36).substr(2, 9),
            text: opt,
            votes: []
          })),
          createdBy: userProfile.id,
          createdAt: new Date().toISOString(),
          isActive: true
        };
        
        const pollMessage: GroupMessage = {
          id: Math.random().toString(36).substr(2, 9),
          userId: userProfile.id,
          userName: userProfile.name,
          userAvatar: userProfile.avatar,
          content: "Created a poll",
          timestamp: new Date().toISOString(),
          readBy: [userProfile.id],
          pollId: newPoll.id
        };

        return { 
          ...g, 
          polls: [...(g.polls || []), newPoll],
          messages: [...(g.messages || []), pollMessage]
        };
      }
      return g;
    }));
  };

  const handleVotePoll = (groupId: string, pollId: string, optionId: string) => {
    setGroups(groups.map(g => {
      if (g.id === groupId) {
        const updatedPolls = (g.polls || []).map(poll => {
           if (poll.id === pollId) {
             const updatedOptions = poll.options.map(opt => {
               const newVotes = opt.votes.filter(uid => uid !== userProfile.id);
               if (opt.id === optionId) {
                 return { ...opt, votes: [...newVotes, userProfile.id] };
               }
               return { ...opt, votes: newVotes };
             });
             return { ...poll, options: updatedOptions };
           }
           return poll;
        });
        return { ...g, polls: updatedPolls };
      }
      return g;
    }));
  };

  const handlePinMessage = (groupId: string, messageId: string, isPinned: boolean) => {
    setGroups(groups.map(g => {
      if (g.id === groupId) {
        const updatedMessages = g.messages.map(m => 
          m.id === messageId ? { ...m, isPinned } : m
        );
        return { ...g, messages: updatedMessages };
      }
      return g;
    }));
  };

  const handleSummarizeChat = async (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return "Group not found";
    return await summarizeGroupChat(group.messages || []);
  };

  // --- Friend Request Actions ---
  
  const handleSendFriendRequest = (friendId: string) => {
    if (friendId === userProfile.id) return;
    if (friends.some(f => f.id === friendId)) return;
    if (friendRequests.some(r => r.fromUser.id === friendId)) return; // Already has incoming

    // Simulation: If sending to a mock user, simulate outgoing request logic (or auto accept for demo)
    // For demo purposes, we just add them directly to simulate "Request Accepted"
    // In a real app, this would POST to an API
    
    const name = `Friend ${friendId.substring(0, 4)}`;
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${friendId}`;
    
    const newFriend: LeaderboardEntry = {
        id: friendId,
        rank: 0, 
        name: name,
        minutes: Math.floor(Math.random() * 500), 
        avatar: avatar,
        trend: 'same',
        rankHistory: [5, 4, 3, 2, 1], 
        isFriend: true,
        region: 'Friend'
    };
    setFriends([...friends, newFriend]);
    alert(`Friend request sent to ${friendId}! (Auto-accepted for demo)`);
  };

  const handleAcceptFriendRequest = (requestId: string) => {
     const req = friendRequests.find(r => r.id === requestId);
     if (!req) return;

     const newFriend: LeaderboardEntry = {
        id: req.fromUser.id,
        rank: 0,
        name: req.fromUser.name,
        minutes: Math.floor(Math.random() * 500),
        avatar: req.fromUser.avatar,
        trend: 'same',
        rankHistory: [5, 4, 3, 2, 1],
        isFriend: true,
        region: req.fromUser.region
     };

     setFriends([...friends, newFriend]);
     setFriendRequests(prev => prev.filter(r => r.id !== requestId));
  };

  const handleRejectFriendRequest = (requestId: string) => {
     setFriendRequests(prev => prev.filter(r => r.id !== requestId));
  };


  const activePlan = savedPlans.find(p => p.id === currentPlanId);

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      {activeSession && (
        <FocusTimer 
          session={activeSession} 
          onComplete={handleSessionComplete}
          onClose={handleCloseSession}
        />
      )}

      {showHistory && (
        <HistoryModal 
          history={history} 
          onClose={() => setShowHistory(false)} 
        />
      )}

      {showProfileModal && (
        <ProfileModal 
          profile={userProfile}
          onSave={setUserProfile}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group" 
            onClick={() => setView('dashboard')}
          >
            <div className="bg-indigo-600 p-2 rounded-lg group-hover:bg-indigo-500 transition-colors">
              <BookOpen className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">MindMap AI</h1>
              <p className="text-xs text-slate-400">Agentic Study Planner</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
             
             <button 
                onClick={() => setView('groups')}
                className={`p-2 rounded-lg transition-colors ${view === 'groups' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                title="Study Groups"
             >
                <Users size={20} />
             </button>

             <button 
                onClick={() => setView('leaderboard')}
                className={`p-2 rounded-lg transition-colors relative ${view === 'leaderboard' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                title="Leaderboard"
             >
                <Trophy size={20} />
                {friendRequests.length > 0 && (
                   <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900"></span>
                )}
             </button>

             <div className="hidden md:flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700 hover:bg-slate-800 transition-colors cursor-default">
               <Zap size={14} className="text-yellow-400" fill="currentColor" />
               <span className="text-xs text-white font-medium">{totalMinutesStudied}m Focused</span>
             </div>

             <button
                onClick={() => setShowProfileModal(true)}
                className="relative group"
                title="Edit Profile"
             >
               <div className="w-9 h-9 rounded-full bg-slate-800 border-2 border-slate-700 hover:border-indigo-500 overflow-hidden transition-colors">
                 <img src={userProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
               </div>
               <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5 border border-slate-700 group-hover:border-indigo-500 transition-colors">
                 <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
               </div>
             </button>

          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-8">
        
        {view === 'dashboard' && (
          <Dashboard 
            plans={savedPlans}
            onCreateNew={handleCreateNew}
            onOpenPlan={handleOpenPlan}
            onTogglePin={handleTogglePin}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDeletePlan}
          />
        )}

        {view === 'groups' && (
          <GroupsView 
            groups={groups}
            userProfile={userProfile}
            userPlans={savedPlans}
            friends={friends}
            typingUsers={typingUsers}
            onCreateGroup={handleCreateGroup}
            onJoinGroup={handleJoinGroup}
            onSharePlan={handleSharePlan}
            onClonePlan={handleClonePlan}
            onAddMember={handleAddMemberToGroup}
            onSendMessage={handleSendMessage}
            onToggleReaction={handleToggleReaction}
            onAddResource={handleAddResource}
            onGetAIRecommendations={suggestVideoResources}
            onUpdateGroupVideo={handleUpdateGroupVideo}
            onMarkMessagesRead={handleMarkMessagesRead}
            onToggleScreenShare={handleToggleScreenShare}
            onCreatePoll={handleCreatePoll}
            onVotePoll={handleVotePoll}
            onPinMessage={handlePinMessage}
            onSummarizeChat={handleSummarizeChat}
            onUserTyping={handleUserTyping}
          />
        )}

        {view === 'leaderboard' && (
          <div>
            <button 
              onClick={() => setView('dashboard')}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
            <Leaderboard 
              currentUserMinutes={totalMinutesStudied} 
              userProfile={userProfile}
              friends={friends}
              incomingRequests={friendRequests}
              onSendRequest={handleSendFriendRequest}
              onAcceptRequest={handleAcceptFriendRequest}
              onRejectRequest={handleRejectFriendRequest}
            />
          </div>
        )}

        {view === 'wizard' && (
          // ... (Wizard content remains unchanged)
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button 
              onClick={() => setView('dashboard')}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft size={16} /> Back to Dashboard
            </button>

            {loadingState === 'analyzing_image' ? (
               <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
                  <Loader2 size={48} className="text-indigo-400 animate-spin" />
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-1">Scanning Syllabus...</h3>
                    <p className="text-slate-400 text-sm">Extracting subjects, dates, and difficulty levels.</p>
                  </div>
               </div>
            ) : loadingState === 'idle' || loadingState === 'error' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Sparkles className="text-indigo-400" size={20} /> New Plan Setup
                    </h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">Start Date</label>
                        <input 
                          type="date" 
                          value={preferences.startDate}
                          onChange={(e) => setPreferences({...preferences, startDate: e.target.value})}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">Daily Available Hours</label>
                        <div className="flex items-center gap-4">
                          <input 
                            type="range" 
                            min="1" max="12" step="0.5"
                            value={preferences.dailyAvailableHours}
                            onChange={(e) => setPreferences({...preferences, dailyAvailableHours: parseFloat(e.target.value)})}
                            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                          <span className="bg-slate-800 text-white px-3 py-1 rounded border border-slate-700 min-w-[3rem] text-center font-mono">
                            {preferences.dailyAvailableHours}h
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-900/30 to-violet-900/30 border border-indigo-500/30 rounded-xl p-6 relative overflow-hidden group">
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-3">
                         <h2 className="text-sm font-bold text-white uppercase tracking-wider">Quick Import</h2>
                         <Camera size={16} className="text-indigo-300" />
                      </div>
                      <p className="text-xs text-slate-300 mb-4">
                        Upload a photo of your exam schedule or syllabus to auto-fill subjects.
                      </p>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden" 
                        accept="image/*"
                      />
                      <button 
                        onClick={handleImageUploadClick}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
                      >
                        <Upload size={14} /> Scan Image
                      </button>
                    </div>
                    <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-indigo-500 blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                  </div>

                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Session Stats</h2>
                      <Zap size={16} className="text-yellow-400" />
                    </div>
                    <div className="text-2xl font-bold text-white mb-4">{totalMinutesStudied}m <span className="text-sm font-normal text-slate-500">total focus</span></div>
                    <button 
                      onClick={() => setShowHistory(true)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <History size={12} /> View History
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Add Subjects</h2>
                    <button 
                      onClick={handleAddSubject}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-sm font-medium transition-colors border border-slate-700"
                    >
                      <Plus size={16} /> Add Subject
                    </button>
                  </div>

                  {error && (
                    <div className="mb-6 p-4 bg-red-900/20 border border-red-900/50 rounded-xl flex items-center gap-3 text-red-300 animate-in fade-in slide-in-from-top-2">
                      <AlertTriangle size={20} />
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {subjects.map(subject => (
                      <SubjectCard 
                        key={subject.id} 
                        subject={subject} 
                        onChange={handleSubjectChange} 
                        onRemove={handleRemoveSubject}
                      />
                    ))}
                  </div>

                  <button 
                    onClick={handleGenerate}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-900/50 transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3"
                  >
                    <Sparkles className="text-yellow-200 animate-pulse" /> Generate Smart Study Plan
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-in fade-in duration-500">
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                  <Loader2 size={64} className="text-indigo-400 animate-spin relative z-10" />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-white">
                    {loadingState === 'rescheduling' ? 'Re-optimizing Schedule...' : 'Agent is Reasoning...'}
                  </h2>
                  <p className="text-slate-400">
                    {loadingState === 'rescheduling' 
                      ? 'Adapting to missed sessions and new priorities.'
                      : `Analyzing ${subjects.length} subjects and optimizing for ${preferences.dailyAvailableHours} hours/day.`}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'plan' && activePlan && (
          <div>
            <div className="flex items-center gap-4 mb-6">
              <button 
                onClick={() => setView('dashboard')}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {activePlan.title}
                  {activePlan.isPinned && <Pin size={16} className="text-indigo-400" fill="currentColor" />}
                  {activePlan.isFavorite && <Heart size={16} className="text-pink-500" fill="currentColor" />}
                </h2>
                <p className="text-sm text-slate-500">Generated on {new Date(activePlan.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            <PlanView 
              plan={activePlan.data} 
              onRegenerate={() => {
                setView('wizard');
              }} 
              onStartSession={handleStartSession} 
              onUpdateSessionStatus={handleUpdateSessionStatus}
              onReschedule={handleReschedule}
              onExportCalendar={handleExportCalendar}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;


export enum DifficultyLevel {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard',
  Expert = 'Expert'
}

export interface Chapter {
  id: string;
  name: string;
  difficulty: number; // 1-10
  isHighPriority: boolean;
}

export interface SubjectInput {
  id: string;
  name: string;
  difficulty: number; // 1-10
  examDate: string; // YYYY-MM-DD
  currentConfidence: number; // 1-100
  isHighPriority: boolean;
  chapters: Chapter[];
}

export interface PlanPreferences {
  dailyAvailableHours: number;
  startDate: string;
}

export type SessionStatus = 'pending' | 'completed' | 'missed';

export interface StudySession {
  id: string; // Added for tracking specific sessions
  subjectName: string;
  durationMinutes: number;
  focusTopic: string;
  reasoning: string; // Why the agent chose this
  status?: SessionStatus; // Track progress
}

export interface DailyPlan {
  date: string;
  sessions: StudySession[];
  totalStudyTime: number;
}

export interface GeneratedPlan {
  overview: string;
  schedule: DailyPlan[];
  stats: {
    subjectAllocation: { name: string; totalMinutes: number }[];
  };
}

export interface SavedPlan {
  id: string;
  title: string;
  createdAt: string;
  isPinned: boolean;
  isFavorite: boolean;
  data: GeneratedPlan;
  // We store the inputs so we can regenerate/edit later
  originalSubjects: SubjectInput[]; 
  originalPreferences: PlanPreferences;
}

export type LoadingState = 'idle' | 'thinking' | 'generating' | 'analyzing_image' | 'rescheduling' | 'summarizing_chat' | 'complete' | 'error';
export type AppView = 'dashboard' | 'wizard' | 'plan' | 'leaderboard' | 'groups';

export interface FocusHistoryEntry {
  id: string;
  subjectName: string;
  focusTopic: string;
  durationMinutes: number;
  completedAt: string; // ISO Date
}

export interface FocusSessionProps {
  session: StudySession;
  onComplete: (minutesLogged: number) => void;
  onClose: () => void;
}

export type LeaderboardCategory = 'world' | 'regional' | 'friends';

export interface UserProfile {
  id: string; // The Unique Friend ID (e.g., MIND-1234)
  name: string;
  avatar: string;
  region: string;
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  minutes: number;
  avatar: string; 
  trend: 'up' | 'down' | 'same';
  rankHistory: number[]; // Array of past ranks for sparklines
  isCurrentUser?: boolean;
  isFriend?: boolean;
  region?: string;
}

// New Friend Request Interface
export interface FriendRequest {
  id: string;
  fromUser: {
    id: string;
    name: string;
    avatar: string;
    region: string;
  };
  timestamp: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface LeaderboardProps {
  currentUserMinutes: number;
  userProfile: UserProfile;
  friends: LeaderboardEntry[];
  incomingRequests: FriendRequest[]; // New prop
  onSendRequest: (friendId: string) => void; // Changed from onAddFriend
  onAcceptRequest: (requestId: string) => void; // New
  onRejectRequest: (requestId: string) => void; // New
}

// --- GROUP TYPES ---

export type GroupPrivacy = 'public' | 'private';

export interface MessageReaction {
  emoji: string;
  userIds: string[];
}

export interface GroupPollOption {
  id: string;
  text: string;
  votes: string[]; // Array of user IDs
}

export interface GroupPoll {
  id: string;
  question: string;
  options: GroupPollOption[];
  createdBy: string;
  createdAt: string;
  isActive: boolean;
}

export interface GroupMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: string;
  reactions?: MessageReaction[];
  readBy: string[]; // Array of user IDs who have read this message
  isPinned?: boolean;
  // If the message is actually a poll display
  pollId?: string;
  // Reply Logic
  replyTo?: {
    id: string;
    userName: string;
    content: string;
  };
}

export interface GroupMember {
  userId: string;
  name: string;
  avatar: string;
  role: 'admin' | 'member'; // Role field defining permissions
  joinedAt: string;
  // New: Live Status
  activeStatus?: {
    isOnline: boolean;
    currentFocus?: string; // e.g., "Calculus"
    startedAt?: string;
  };
}

export interface SharedPlanItem {
  id: string;
  originalPlanId: string;
  planTitle: string;
  planOverview: string;
  sharedBy: {
    userId: string;
    name: string;
    avatar: string;
  };
  sharedAt: string;
  planData: GeneratedPlan;
  originalSubjects: SubjectInput[];
  originalPreferences: PlanPreferences;
  likes: number;
  clones: number;
}

export interface GroupResource {
  id: string;
  title: string;
  type: 'link' | 'file' | 'image';
  url: string; // Or content
  description?: string;
  addedBy: {
    userId: string;
    name: string;
    avatar: string;
  };
  addedAt: string;
}

export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  privacy: GroupPrivacy;
  members: GroupMember[];
  sharedPlans: SharedPlanItem[];
  messages: GroupMessage[]; 
  resources: GroupResource[];
  polls?: GroupPoll[]; // New Polls Array
  createdBy: string;
  createdAt: string;
  imageUrl?: string;
  activeVideo?: {
    url: string;
    title: string;
    startedAt: string;
  } | null;
  activeScreenShare?: {
    userId: string;
    userName: string;
  } | null;
}

export interface GroupsViewProps {
  groups: StudyGroup[];
  userProfile: UserProfile;
  userPlans: SavedPlan[];
  friends: LeaderboardEntry[];
  // Mapping of GroupID -> Array of names of people currently typing
  typingUsers?: Record<string, string[]>; 
  onCreateGroup: (name: string, description: string, privacy: GroupPrivacy) => void;
  onJoinGroup: (groupId: string) => void;
  onSharePlan: (groupId: string, plan: SavedPlan) => void;
  onClonePlan: (sharedPlan: SharedPlanItem) => void;
  onAddMember: (groupId: string, friend: LeaderboardEntry) => void;
  onSendMessage: (groupId: string, content: string, replyToMessageId?: string) => void;
  onAddResource: (groupId: string, resource: Omit<GroupResource, 'id' | 'addedBy' | 'addedAt'>) => void;
  onGetAIRecommendations: (subject: string) => Promise<any[]>; 
  onUpdateGroupVideo: (groupId: string, videoUrl: string | null, title?: string, seekToSeconds?: number) => void;
  onToggleReaction: (groupId: string, messageId: string, emoji: string) => void;
  onMarkMessagesRead: (groupId: string, messageIds: string[]) => void;
  onToggleScreenShare: (groupId: string, isSharing: boolean) => void;
  // New Props
  onCreatePoll: (groupId: string, question: string, options: string[]) => void;
  onVotePoll: (groupId: string, pollId: string, optionId: string) => void;
  onPinMessage: (groupId: string, messageId: string, isPinned: boolean) => void;
  onSummarizeChat: (groupId: string) => Promise<string>;
  onUserTyping: (groupId: string) => void;
}

export interface PlanViewProps {
  plan: GeneratedPlan;
  onRegenerate: () => void;
  onStartSession: (session: StudySession) => void;
  onUpdateSessionStatus: (date: string, sessionId: string, status: SessionStatus) => void;
  onReschedule: () => void;
  onExportCalendar: () => void;
}

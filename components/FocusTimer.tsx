
import React, { useState, useEffect, useRef } from 'react';
import { StudySession } from '../types';
import { Play, Pause, RotateCcw, Coffee, Brain, CheckCircle2, Minimize2 } from 'lucide-react';

interface FocusTimerProps {
  session: StudySession;
  onComplete: (minutesLogged: number) => void;
  onClose: () => void;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({ session, onComplete, onClose }) => {
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionMinutesLogged, setSessionMinutesLogged] = useState(0);

  const timerRef = useRef<number | null>(null);

  const totalTime = mode === 'focus' ? 25 * 60 : 5 * 60;

  // SVG Configuration for Progress Ring
  const radius = 120;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (timeLeft / totalTime) * circumference;

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      if (isActive) {
        setIsActive(false);
        if (mode === 'focus') {
          setSessionMinutesLogged((prev) => prev + 25);
        }
      }
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, mode]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const switchMode = (newMode: 'focus' | 'break') => {
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(newMode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const handleFinish = () => {
    onComplete(sessionMinutesLogged);
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Theme colors based on mode
  const theme = mode === 'focus' ? {
    primary: 'text-indigo-500',
    bg: 'bg-indigo-600',
    bgHover: 'hover:bg-indigo-500',
    border: 'border-indigo-500/30',
    shadow: 'shadow-indigo-500/20',
    ringColor: 'stroke-indigo-500',
    gradient: 'from-indigo-500 to-purple-600'
  } : {
    primary: 'text-emerald-500',
    bg: 'bg-emerald-600',
    bgHover: 'hover:bg-emerald-500',
    border: 'border-emerald-500/30',
    shadow: 'shadow-emerald-500/20',
    ringColor: 'stroke-emerald-500',
    gradient: 'from-emerald-500 to-teal-600'
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Background Glow */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 ${mode === 'focus' ? 'bg-indigo-500' : 'bg-emerald-500'} rounded-full blur-[100px] opacity-10 pointer-events-none`} />

        {/* Header */}
        <div className="flex justify-between items-start mb-6 relative z-10">
            <div>
                <h2 className="text-xl font-bold text-white line-clamp-1">{session.subjectName}</h2>
                <p className={`text-sm font-medium ${theme.primary} mt-1`}>{session.focusTopic}</p>
            </div>
            <button 
              onClick={onClose}
              className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"
              title="Close without saving"
            >
              <Minimize2 size={20} />
            </button>
        </div>

        {/* Timer Display with Circular Progress */}
        <div className="relative flex items-center justify-center mb-8">
           <div className="relative w-72 h-72">
             <svg
               height="100%"
               width="100%"
               className="transform -rotate-90"
             >
               {/* Track Ring */}
               <circle
                 stroke="currentColor"
                 className="text-slate-800"
                 strokeWidth={stroke}
                 fill="transparent"
                 r={normalizedRadius}
                 cx={radius}
                 cy={radius}
               />
               {/* Progress Ring */}
               <circle
                 stroke="currentColor"
                 className={`${theme.ringColor} transition-all duration-500 ease-in-out`}
                 strokeWidth={stroke}
                 strokeDasharray={circumference + ' ' + circumference}
                 style={{ strokeDashoffset }}
                 strokeLinecap="round"
                 fill="transparent"
                 r={normalizedRadius}
                 cx={radius}
                 cy={radius}
               />
             </svg>
             
             {/* Time Text */}
             <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={`text-6xl font-mono font-bold text-white tracking-tighter tabular-nums drop-shadow-lg`}>
                    {formatTime(timeLeft)}
                </div>
                <div className={`mt-2 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase border ${theme.border} ${mode === 'focus' ? 'bg-indigo-950/50 text-indigo-200' : 'bg-emerald-950/50 text-emerald-200'}`}>
                    {isActive ? 'Running' : 'Paused'}
                </div>
             </div>
           </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center items-center gap-8 mb-10 relative z-10">
            {/* Reset Button */}
          <button 
            onClick={resetTimer}
            className="p-4 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700 hover:border-slate-600 group"
            title="Reset Timer"
          >
            <RotateCcw size={20} className="group-hover:-rotate-180 transition-transform duration-500" />
          </button>

          {/* Play/Pause Button */}
          <button 
            onClick={toggleTimer}
            className={`w-20 h-20 rounded-full flex items-center justify-center text-white transition-all transform hover:scale-105 active:scale-95 shadow-xl ${theme.shadow} bg-gradient-to-br ${theme.gradient}`}
          >
            {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
          </button>
          
          {/* Finish Button */}
          <button 
             onClick={handleFinish}
             className="p-4 rounded-full bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 transition-colors border border-slate-700 hover:border-emerald-500/50"
             title="Finish & Save Session"
            >
            <CheckCircle2 size={20} />
          </button>
        </div>

        {/* Mode Switcher & Stats */}
        <div className="relative z-10">
          <div className="bg-slate-950/50 p-1 rounded-2xl border border-slate-800 flex mb-4">
            <button 
              onClick={() => switchMode('focus')}
              className={`flex-1 py-3 text-sm font-medium rounded-xl transition-all flex items-center justify-center gap-2 ${
                mode === 'focus' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Brain size={16} /> Focus
            </button>
            <button 
              onClick={() => switchMode('break')}
              className={`flex-1 py-3 text-sm font-medium rounded-xl transition-all flex items-center justify-center gap-2 ${
                mode === 'break' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Coffee size={16} /> Break
            </button>
          </div>

          <div className="text-center text-xs text-slate-500 font-medium">
             Session Time Logged: <span className="text-slate-300">{sessionMinutesLogged} min</span>
          </div>
        </div>
      </div>
    </div>
  );
};

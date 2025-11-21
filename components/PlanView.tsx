
import React, { useState } from 'react';
import { GeneratedPlan, StudySession, PlanViewProps } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Clock, Brain, Target, CalendarCheck, PlayCircle, RefreshCw, CalendarDays, XCircle, CheckCircle, Sparkles } from 'lucide-react';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981', '#3b82f6'];

export const PlanView: React.FC<PlanViewProps> = ({ plan, onRegenerate, onStartSession, onUpdateSessionStatus, onReschedule, onExportCalendar }) => {
  
  const hasMissedSessions = plan.schedule.some(day => day.sessions.some(s => s.status === 'missed'));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Overview Section */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="text-indigo-400" /> Strategic Overview
          </h2>
          <div className="flex items-center gap-2">
            <button 
               onClick={onExportCalendar}
               className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-white rounded-lg text-sm font-medium transition-all"
               title="Export to .ics"
             >
               <CalendarDays size={16} /> Export
             </button>
             {hasMissedSessions && (
               <button 
                 onClick={onReschedule}
                 className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-all animate-pulse shadow-lg shadow-indigo-900/30"
               >
                 <Sparkles size={16} /> Smart Reschedule
               </button>
             )}
            <button 
              onClick={onRegenerate}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-all"
            >
              <RefreshCw size={14} /> Edit & Regenerate
            </button>
          </div>
        </div>
        <p className="text-slate-300 leading-relaxed border-l-4 border-indigo-500 pl-4">
          {plan.overview}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Schedule List */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <CalendarCheck className="text-emerald-400" /> Daily Schedule
          </h3>
          
          <div className="space-y-4">
            {plan.schedule.map((day, idx) => (
              <div key={idx} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="bg-slate-900/50 px-6 py-3 border-b border-slate-700 flex justify-between items-center">
                  <span className="font-semibold text-indigo-200">{day.date}</span>
                  <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-full flex items-center gap-1">
                    <Clock size={12} /> {Math.round(day.totalStudyTime / 60 * 10) / 10} hrs total
                  </span>
                </div>
                <div className="divide-y divide-slate-700/50">
                  {day.sessions.map((session, sIdx) => {
                    const isMissed = session.status === 'missed';
                    const isCompleted = session.status === 'completed';

                    return (
                      <div key={sIdx} className={`p-4 transition-colors group ${isMissed ? 'bg-red-900/10' : isCompleted ? 'bg-emerald-900/10' : 'hover:bg-slate-700/30'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                             {isCompleted && <CheckCircle size={18} className="text-emerald-500" />}
                             {isMissed && <XCircle size={18} className="text-red-500" />}
                             <h4 className={`font-medium text-lg ${isMissed ? 'text-red-200' : isCompleted ? 'text-emerald-200 line-through opacity-70' : 'text-white'}`}>{session.subjectName}</h4>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono text-indigo-400 bg-indigo-900/20 px-2 py-1 rounded border border-indigo-500/30">
                              {session.durationMinutes} min
                            </span>
                            {!isCompleted && !isMissed && (
                              <>
                                <button 
                                  onClick={() => onUpdateSessionStatus(day.date, session.id, 'missed')}
                                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                  title="Mark as Missed"
                                >
                                  <XCircle size={16} />
                                </button>
                                <button 
                                  onClick={() => onStartSession(session)}
                                  className="p-1.5 text-emerald-400 bg-emerald-900/20 border border-emerald-500/30 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald-500 hover:text-white flex items-center gap-1 text-xs font-medium pr-2"
                                  title="Start Focus Session"
                                >
                                  <PlayCircle size={14} /> Start Focus
                                </button>
                              </>
                            )}
                            {isMissed && (
                               <button 
                                 onClick={() => onUpdateSessionStatus(day.date, session.id, 'pending')}
                                 className="text-xs text-indigo-400 hover:underline"
                               >
                                 Undo
                               </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start gap-2 mb-2">
                          <Target size={16} className="text-slate-400 mt-1 shrink-0" />
                          <p className="text-slate-300 text-sm font-medium">
                            Focus: <span className="text-indigo-300">{session.focusTopic}</span>
                          </p>
                        </div>
                        <p className="text-slate-500 text-xs italic pl-6 border-l-2 border-slate-600">
                          Reasoning: {session.reasoning}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Column */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-white">Time Allocation</h3>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={plan.stats.subjectAllocation}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{fill: '#94a3b8', fontSize: 12}} 
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9'}}
                  itemStyle={{color: '#818cf8'}}
                />
                <Bar dataKey="totalMinutes" radius={[4, 4, 0, 0]}>
                  {plan.stats.subjectAllocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-center text-xs text-slate-500 mt-2">Total Minutes per Subject</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h4 className="text-lg font-medium text-white mb-4">Productivity Tips</h4>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex gap-2">
                <span className="text-indigo-500">•</span> Use the Pomodoro technique (25m focus / 5m break).
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-500">•</span> Hydrate between subject switches.
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-500">•</span> Review difficult subjects first when energy is high.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

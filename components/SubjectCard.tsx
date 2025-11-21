
import React, { useState } from 'react';
import { SubjectInput, Chapter } from '../types';
import { Trash2, Calendar, Star, ChevronDown, ChevronUp, Plus, Book } from 'lucide-react';

interface SubjectCardProps {
  subject: SubjectInput;
  onChange: (id: string, field: keyof SubjectInput, value: any) => void;
  onRemove: (id: string) => void;
}

export const SubjectCard: React.FC<SubjectCardProps> = ({ subject, onChange, onRemove }) => {
  const [showChapters, setShowChapters] = useState(false);

  const addChapter = () => {
    const newChapter: Chapter = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      difficulty: 5,
      isHighPriority: false
    };
    onChange(subject.id, 'chapters', [...(subject.chapters || []), newChapter]);
    setShowChapters(true);
  };

  const updateChapter = (chapterId: string, field: keyof Chapter, value: any) => {
    const updatedChapters = subject.chapters.map(ch => 
      ch.id === chapterId ? { ...ch, [field]: value } : ch
    );
    onChange(subject.id, 'chapters', updatedChapters);
  };

  const removeChapter = (chapterId: string) => {
    const updatedChapters = subject.chapters.filter(ch => ch.id !== chapterId);
    onChange(subject.id, 'chapters', updatedChapters);
  };

  return (
    <div className={`bg-slate-800 border rounded-xl p-4 shadow-sm transition-all group ${subject.isHighPriority ? 'border-yellow-500/40 bg-yellow-900/10' : 'border-slate-700 hover:border-indigo-500'}`}>
      {/* Main Subject Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 mr-4">
          <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
            Subject Name
            {subject.isHighPriority && <span className="text-[10px] bg-yellow-500/20 text-yellow-200 px-1.5 py-0.5 rounded border border-yellow-500/30 font-bold tracking-wide">PRIORITY</span>}
          </label>
          <input
            type="text"
            value={subject.name}
            onChange={(e) => onChange(subject.id, 'name', e.target.value)}
            placeholder="e.g. Calculus II"
            className="w-full bg-slate-900 text-white rounded-md px-3 py-2 border border-slate-700 focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onChange(subject.id, 'isHighPriority', !subject.isHighPriority)}
            className={`p-2 rounded-lg transition-all ${
              subject.isHighPriority 
                ? 'text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20' 
                : 'text-slate-600 hover:text-yellow-400 hover:bg-slate-700'
            }`}
            title={subject.isHighPriority ? "Unmark priority" : "Mark as High Priority"}
          >
            <Star size={18} fill={subject.isHighPriority ? "currentColor" : "none"} />
          </button>
          <button 
            onClick={() => onRemove(subject.id)}
            className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Remove subject"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Main Subject Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Difficulty Slider */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-xs text-slate-400 uppercase tracking-wider">Subject Difficulty</label>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
              subject.difficulty > 7 ? 'bg-red-900/50 text-red-200' : 
              subject.difficulty > 4 ? 'bg-yellow-900/50 text-yellow-200' : 
              'bg-green-900/50 text-green-200'
            }`}>
              {subject.difficulty}/10
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={subject.difficulty}
            onChange={(e) => onChange(subject.id, 'difficulty', parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        {/* Exam Date */}
        <div>
           <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
             <Calendar size={12} /> Exam Date
           </label>
           <input
            type="date"
            value={subject.examDate}
            onChange={(e) => onChange(subject.id, 'examDate', e.target.value)}
            className="w-full bg-slate-900 text-white rounded-md px-3 py-2 border border-slate-700 focus:border-indigo-500 focus:outline-none text-sm"
           />
        </div>
      </div>

      {/* Chapters Section */}
      <div className="border-t border-slate-700 pt-3">
        <button 
          onClick={() => setShowChapters(!showChapters)}
          className="flex items-center gap-2 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors mb-2 w-full"
        >
          {showChapters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {subject.chapters?.length > 0 ? `Manage ${subject.chapters.length} Chapters` : 'Add Specific Chapters (Optional)'}
        </button>

        {showChapters && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            {(subject.chapters || []).map(chapter => (
              <div key={chapter.id} className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                <div className="text-slate-500">
                  <Book size={14} />
                </div>
                <input
                  type="text"
                  value={chapter.name}
                  onChange={(e) => updateChapter(chapter.id, 'name', e.target.value)}
                  placeholder="Chapter Name"
                  className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder:text-slate-600"
                />
                <div className="flex items-center gap-1 bg-slate-800 rounded px-1.5 py-1 border border-slate-700" title="Chapter Difficulty">
                  <span className="text-[10px] text-slate-400 font-mono">Diff:</span>
                  <input 
                    type="number" 
                    min="1" max="10" 
                    value={chapter.difficulty}
                    onChange={(e) => updateChapter(chapter.id, 'difficulty', parseInt(e.target.value))}
                    className="w-8 bg-transparent text-xs text-center focus:outline-none text-indigo-300 font-mono"
                  />
                </div>
                <button
                  onClick={() => updateChapter(chapter.id, 'isHighPriority', !chapter.isHighPriority)}
                  className={`p-1.5 rounded hover:bg-slate-700 transition-colors ${chapter.isHighPriority ? 'text-yellow-400' : 'text-slate-600'}`}
                  title="Prioritize Chapter"
                >
                  <Star size={14} fill={chapter.isHighPriority ? "currentColor" : "none"} />
                </button>
                <button
                  onClick={() => removeChapter(chapter.id)}
                  className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                >
                  <XIcon size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={addChapter}
              className="w-full py-2 border border-dashed border-slate-700 rounded-lg text-xs text-slate-500 hover:text-indigo-400 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-1"
            >
              <Plus size={14} /> Add Chapter
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Simple icon helper since we can't import lucide-react's X directly if it conflicts or isn't imported
const XIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M18 6 6 18"/><path d="m6 6 18 18"/>
  </svg>
);

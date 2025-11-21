
import React from 'react';
import { FocusHistoryEntry } from '../types';
import { X, History, Clock, Calendar } from 'lucide-react';

interface HistoryModalProps {
  history: FocusHistoryEntry[];
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ history, onClose }) => {
  const totalMinutes = history.reduce((acc, curr) => acc + curr.durationMinutes, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/20 p-2 rounded-lg">
              <History className="text-indigo-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Study History</h2>
              <p className="text-xs text-slate-400">
                Total recorded: <span className="text-indigo-300">{Math.round(totalMinutes / 60 * 10) / 10} hours</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-500 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
              <History size={48} className="mb-4 opacity-20" />
              <p>No sessions completed yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...history].reverse().map((entry) => (
                <div key={entry.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800 transition-colors flex justify-between items-center group">
                  <div>
                    <h4 className="text-white font-medium mb-1">{entry.subjectName}</h4>
                    <p className="text-sm text-slate-400 flex items-center gap-2">
                      <span className="text-indigo-400 bg-indigo-900/20 px-1.5 py-0.5 rounded text-xs border border-indigo-500/20">{entry.focusTopic}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1.5 text-indigo-300 font-mono font-medium mb-1">
                      <Clock size={14} /> {entry.durationMinutes}m
                    </div>
                    <div className="text-xs text-slate-500 flex items-center justify-end gap-1">
                      <Calendar size={12} />
                      {new Date(entry.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

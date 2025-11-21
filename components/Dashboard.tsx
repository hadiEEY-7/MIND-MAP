
import React from 'react';
import { SavedPlan } from '../types';
import { Plus, Pin, Heart, Calendar, ArrowRight, Brain, Trash2 } from 'lucide-react';

interface DashboardProps {
  plans: SavedPlan[];
  onCreateNew: () => void;
  onOpenPlan: (plan: SavedPlan) => void;
  onTogglePin: (id: string, e: React.MouseEvent) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  plans, 
  onCreateNew, 
  onOpenPlan, 
  onTogglePin, 
  onToggleFavorite,
  onDelete
}) => {
  const pinnedPlans = plans.filter(p => p.isPinned);
  const otherPlans = plans.filter(p => !p.isPinned);

  const PlanCard = ({ plan }: { plan: SavedPlan }) => (
    <div 
      onClick={() => onOpenPlan(plan)}
      className={`group relative bg-slate-800 border rounded-xl p-5 transition-all cursor-pointer hover:-translate-y-1 ${plan.isPinned ? 'border-indigo-500/50 shadow-lg shadow-indigo-900/20' : 'border-slate-700 hover:border-indigo-500/50 hover:shadow-md'}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
           <div className={`p-2 rounded-lg ${plan.isPinned ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-700 text-slate-400'}`}>
             <Brain size={20} />
           </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => onTogglePin(plan.id, e)}
            className={`p-2 rounded-full transition-colors hover:bg-slate-700 ${plan.isPinned ? 'text-indigo-400' : 'text-slate-600'}`}
            title={plan.isPinned ? "Unpin" : "Pin to top"}
          >
            <Pin size={16} fill={plan.isPinned ? "currentColor" : "none"} />
          </button>
          <button
            onClick={(e) => onToggleFavorite(plan.id, e)}
            className={`p-2 rounded-full transition-colors hover:bg-slate-700 ${plan.isFavorite ? 'text-pink-500' : 'text-slate-600'}`}
            title={plan.isFavorite ? "Unfavorite" : "Favorite"}
          >
            <Heart size={16} fill={plan.isFavorite ? "currentColor" : "none"} />
          </button>
          <button
            onClick={(e) => onDelete(plan.id, e)}
            className="p-2 rounded-full transition-colors hover:bg-red-900/20 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100"
            title="Delete Plan"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-indigo-300 transition-colors">
        {plan.title}
      </h3>
      <p className="text-xs text-slate-400 mb-4 line-clamp-2">
        {plan.data.overview}
      </p>

      <div className="flex items-center justify-between border-t border-slate-700/50 pt-3 mt-auto">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Calendar size={12} />
          <span>{new Date(plan.createdAt).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-1 text-xs font-medium text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
          Open <ArrowRight size={12} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Welcome / Hero */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-gradient-to-r from-indigo-900/40 to-slate-900 border border-indigo-500/20 rounded-2xl p-8">
        <div className="mb-6 md:mb-0">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-slate-400">You have <span className="text-white font-bold">{plans.length}</span> active study plans.</p>
        </div>
        <button 
          onClick={onCreateNew}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-900/30 transition-all transform hover:scale-105 active:scale-95"
        >
          <Plus size={20} /> Create New Plan
        </button>
      </div>

      {/* Pinned Section */}
      {pinnedPlans.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Pin size={18} className="text-indigo-400" fill="currentColor" /> Pinned Plans
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pinnedPlans.map(plan => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
      )}

      {/* All Plans Section */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          {pinnedPlans.length > 0 ? "Other Plans" : "Recent Plans"}
        </h2>
        
        {otherPlans.length === 0 && pinnedPlans.length === 0 ? (
           <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-2xl">
             <div className="bg-slate-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
               <Brain className="text-slate-600" size={32} />
             </div>
             <h3 className="text-white font-medium mb-2">No plans yet</h3>
             <p className="text-slate-500 mb-6 max-w-sm mx-auto">Create your first AI-powered study schedule to get started.</p>
             <button 
                onClick={onCreateNew}
                className="text-indigo-400 hover:text-indigo-300 font-medium text-sm hover:underline"
              >
                Create a plan now
              </button>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherPlans.map(plan => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

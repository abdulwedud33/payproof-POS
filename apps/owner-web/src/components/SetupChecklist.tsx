'use client';

import React, { useState } from 'react';
import { CheckCircle2, Circle, ChevronRight, X, Sparkles } from 'lucide-react';

export interface SetupStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  actionTab?: 'branches' | 'accounts' | 'products';
}

interface SetupChecklistProps {
  steps: SetupStep[];
  onNavigateTab?: (tab: 'branches' | 'accounts' | 'products') => void;
}

export function SetupChecklist({ steps, onNavigateTab }: SetupChecklistProps) {
  const [dismissed, setDismissed] = useState(false);
  const completedCount = steps.filter((s) => s.completed).length;
  const totalCount = steps.length;
  const isAllComplete = completedCount === totalCount;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  if (dismissed) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-8 shadow-xs">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Supermarket Setup Progress ({completedCount}/{totalCount} Completed)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAllComplete
                ? 'All primary verification systems and branch catalogs are ready for live sales.'
                : 'Complete these essential configurations to unlock multi-branch mobile-money operations.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
          title="Dismiss checklist"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${
            isAllComplete ? 'bg-emerald-500' : 'bg-blue-600'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Steps List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {steps.map((step) => (
          <div
            key={step.id}
            onClick={() => step.actionTab && onNavigateTab && onNavigateTab(step.actionTab)}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
              step.completed
                ? 'bg-slate-50/50 border-slate-200/60'
                : 'bg-white border-blue-100 hover:border-blue-300 hover:shadow-xs cursor-pointer'
            }`}
          >
            {step.completed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <Circle className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4
                  className={`text-xs font-semibold ${
                    step.completed ? 'text-slate-700 line-through' : 'text-slate-900'
                  }`}
                >
                  {step.title}
                </h4>
                {!step.completed && (
                  <ChevronRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

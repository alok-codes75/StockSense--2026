import React from 'react';
import { PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-dashed border-slate-300 my-4">
      <div className="p-4 rounded-2xl bg-slate-50 text-slate-400 mb-4 border border-slate-100">
        {icon || <PackageOpen className="w-8 h-8" />}
      </div>
      <h3 className="text-base font-semibold text-slate-800 tracking-tight">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Loading inventory data...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
      <div className="w-8 h-8 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
      <span className="text-xs font-medium text-slate-500 tracking-wide">{message}</span>
    </div>
  );
};

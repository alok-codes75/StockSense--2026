import React from 'react';

interface BadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, size = 'sm' }) => {
  let style = 'bg-slate-100 text-slate-700 border-slate-200';
  let label = status;

  switch (status) {
    case 'DONE':
      style = 'bg-emerald-50 text-emerald-700 border-emerald-200/80 font-medium';
      label = 'Done / Processed';
      break;
    case 'READY':
      style = 'bg-indigo-50 text-indigo-700 border-indigo-200/80 font-medium';
      label = 'Ready for Validation';
      break;
    case 'DRAFT':
      style = 'bg-slate-100 text-slate-600 border-slate-200 font-medium';
      label = 'Draft';
      break;
    case 'CANCELLED':
      style = 'bg-rose-50 text-rose-700 border-rose-200/80 font-medium';
      label = 'Cancelled';
      break;
    case 'IN_STOCK':
      style = 'bg-emerald-50 text-emerald-700 border-emerald-200/80 font-medium';
      label = 'In Stock';
      break;
    case 'LOW_STOCK':
      style = 'bg-amber-50 text-amber-800 border-amber-300 font-semibold';
      label = 'Low Stock';
      break;
    case 'OUT_OF_STOCK':
      style = 'bg-rose-50 text-rose-800 border-rose-300 font-semibold';
      label = 'Out of Stock';
      break;
    case 'INVENTORY_MANAGER':
      style = 'bg-purple-50 text-purple-700 border-purple-200 font-semibold';
      label = 'Manager';
      break;
    case 'WAREHOUSE_STAFF':
      style = 'bg-blue-50 text-blue-700 border-blue-200 font-semibold';
      label = 'Warehouse Staff';
      break;
    case 'RECEIPT':
      style = 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium';
      label = 'Receipt (+ In)';
      break;
    case 'DELIVERY':
      style = 'bg-blue-50 text-blue-800 border-blue-200 font-medium';
      label = 'Delivery (- Out)';
      break;
    case 'INTERNAL_TRANSFER_IN':
      style = 'bg-cyan-50 text-cyan-800 border-cyan-200 font-medium';
      label = 'Transfer In (+ In)';
      break;
    case 'INTERNAL_TRANSFER_OUT':
      style = 'bg-amber-50 text-amber-800 border-amber-200 font-medium';
      label = 'Transfer Out (- Out)';
      break;
    case 'INVENTORY_ADJUSTMENT':
      style = 'bg-violet-50 text-violet-800 border-violet-200 font-medium';
      label = 'Cycle Adjustment';
      break;
    case 'INITIAL_BALANCE':
      style = 'bg-slate-100 text-slate-800 border-slate-300 font-medium';
      label = 'Baseline Balance';
      break;
    default:
      label = status.replace(/_/g, ' ');
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border tracking-tight ${sizeClasses} ${style}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
};

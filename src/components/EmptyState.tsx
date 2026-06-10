import React from 'react';

type Props = {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

/** Estado vazio amigável: ícone, título, descrição e ação opcional. */
export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="text-center py-12 px-4">
      <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-300 flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <p className="font-semibold text-gray-700 text-sm">{title}</p>
      {description && <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

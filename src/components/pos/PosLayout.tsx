import { type ReactNode } from 'react';

interface PosLayoutProps {
  leftContent: ReactNode;
  rightContent: ReactNode;
}

export function PosLayout({ leftContent, rightContent }: PosLayoutProps) {
  return (
    <div className="flex flex-col lg:flex-row h-full bg-slate-100 overflow-hidden text-slate-900">
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 border-r border-slate-200">
        {leftContent}
      </div>
      <div className="w-full lg:w-[400px] xl:w-[450px] flex-shrink-0 flex flex-col bg-white shadow-xl z-10">
        {rightContent}
      </div>
    </div>
  );
}

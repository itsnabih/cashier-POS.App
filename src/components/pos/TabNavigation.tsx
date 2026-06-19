interface TabNavigationProps {
  activeTab: number;
  onSwitchTab: (index: number) => void;
  tabItemCounts: number[];
}

export function TabNavigation({ activeTab, onSwitchTab, tabItemCounts }: TabNavigationProps) {
  return (
    <div className="flex items-center gap-2 p-3 bg-white border-b border-slate-200">
      {Array.from({ length: 5 }).map((_, i) => {
        const isActive = activeTab === i;
        const count = tabItemCounts[i] || 0;
        return (
          <button
            key={i}
            onClick={() => onSwitchTab(i)}
            className={`relative flex flex-col items-center justify-center px-4 py-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
              isActive
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className="text-xs font-semibold">Tab {i + 1}</span>
            <span
              className={`text-[10px] mt-0.5 px-1.5 rounded-full ${
                isActive ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}
            >
              F{i + 1}
            </span>
            {count > 0 && (
              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white shadow-sm">
                {count}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

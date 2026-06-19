'use client';

import { useState, useEffect } from 'react';

// ============================================================
// ExpiryAlertWidget — Dashboard expiry warnings
// Tiers: Critical (30d/red), Warning (60d/amber), Info (90d/blue)
// Fetches from GET /api/products/expiring
// ============================================================

interface ExpiringProduct {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  expiredDate: string;
  daysUntilExpiry: number;
  categoryName: string | null;
}

interface ExpiryData {
  critical: ExpiringProduct[];
  warning: ExpiringProduct[];
  info: ExpiringProduct[];
  summary: {
    criticalCount: number;
    warningCount: number;
    infoCount: number;
    totalCount: number;
  };
}

export default function ExpiryAlertWidget() {
  const [data, setData] = useState<ExpiryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'critical' | 'warning' | 'info'>('critical');

  useEffect(() => {
    fetch('/api/products/expiring')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card p-5 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-40 mb-4" />
        <div className="space-y-2">
          <div className="h-3 bg-slate-100 rounded w-full" />
          <div className="h-3 bg-slate-100 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!data || data.summary.totalCount === 0) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">Kedaluwarsa</h3>
        <p className="text-xs text-slate-400">Tidak ada produk mendekati kedaluwarsa.</p>
      </div>
    );
  }

  const tabs = [
    {
      key: 'critical' as const,
      label: 'Kritis',
      count: data.summary.criticalCount,
      dotClass: 'bg-red-500',
      barClass: 'border-b-red-500',
    },
    {
      key: 'warning' as const,
      label: 'Peringatan',
      count: data.summary.warningCount,
      dotClass: 'bg-amber-500',
      barClass: 'border-b-amber-500',
    },
    {
      key: 'info' as const,
      label: 'Info',
      count: data.summary.infoCount,
      dotClass: 'bg-blue-500',
      barClass: 'border-b-blue-500',
    },
  ];

  const activeItems = data[activeTab];

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-800">Kedaluwarsa Produk</h3>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            {data.summary.totalCount} item
          </span>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0 border-b border-slate-200 -mx-5 px-5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 pb-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? `${tab.barClass} text-slate-800`
                  : 'border-b-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${tab.dotClass}`} />
              {tab.label}
              {tab.count > 0 && (
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-3 max-h-64 overflow-y-auto">
        {activeItems.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            Tidak ada produk di kategori ini.
          </p>
        ) : (
          <ul className="space-y-0">
            {activeItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800 truncate font-medium">{item.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.sku && (
                      <span className="text-[10px] text-slate-400 font-mono">{item.sku}</span>
                    )}
                    {item.categoryName && (
                      <span className="text-[10px] text-slate-400">{item.categoryName}</span>
                    )}
                    <span className="text-[10px] text-slate-400">Stok: {item.stock}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <ExpiryBadge days={item.daysUntilExpiry} />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(item.expiredDate).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ExpiryBadge({ days }: { days: number }) {
  if (days <= 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded bg-red-100 text-red-700">
        EXPIRED
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded bg-red-100 text-red-700">
        {days}d
      </span>
    );
  }
  if (days <= 60) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-100 text-amber-700">
        {days}d
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded bg-blue-100 text-blue-700">
      {days}d
    </span>
  );
}

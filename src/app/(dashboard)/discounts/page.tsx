export default function DiscountsPage() {
  return (
    <div className="space-y-6 animate-in">
      {/* Page header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Diskon</h2>
        <p className="text-sm text-slate-500 mt-0.5">Kelola diskon dan promo produk</p>
      </div>

      {/* Under development notice */}
      <div className="card p-8 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1 3.03a.75.75 0 01-1.1-.66V6.09a1.5 1.5 0 01.68-1.26l5.1-3.03a.75.75 0 01.84 0l5.1 3.03a1.5 1.5 0 01.68 1.26v11.45a.75.75 0 01-1.1.66l-5.1-3.03z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">Under Development</h3>
        <p className="text-sm text-slate-500 max-w-md">
          Fitur manajemen diskon dan promo sedang dalam tahap pengembangan.
          Fitur ini akan tersedia di pembaruan mendatang.
        </p>
        <span className="mt-4 inline-flex items-center px-3 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
          Segera Hadir
        </span>
      </div>
    </div>
  );
}

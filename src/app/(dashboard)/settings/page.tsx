'use client';

import { useState, useEffect } from 'react';
import { ReceiptContent } from '@/components/pos/ReceiptContent';
import { Check } from 'lucide-react';

type SettingsTab = 'profile' | 'users' | 'pos' | 'inventory' | 'system';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'profile',
      label: 'Kustom Struk',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0v2.828c0 .334.136.653.38.893l1.058 1.059h8.122l1.058-1.059a1.25 1.25 0 00.38-.893V7.034z" />
        </svg>
      )
    },
    {
      id: 'users',
      label: 'Pengguna',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      )
    },
    {
      id: 'pos',
      label: 'POS & Struk',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
        </svg>
      )
    },
    {
      id: 'inventory',
      label: 'Inventaris',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      )
    },
    {
      id: 'system',
      label: 'Sistem',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014-5.395c-.318.557-.615 1.135-.89 1.729m2.284 3.666c.01.212.015.426.015.64 0 .214-.005.428-.015.64m-.015-1.28c-.316.557-.614 1.135-.89 1.73m2.284-3.665a23.908 23.908 0 01-1.014 5.395m0 0a23.74 23.74 0 01-1.014 5.395m1.014-5.395c.318.557.615 1.135.89 1.73m-2.284 3.665c-.01.212-.015.426-.015.64 0 .214.005.428.015.64m.015-1.28c.316.557-.614 1.135-.89 1.73m-2.284-3.665a23.905 23.905 0 011.014 5.395m0 0a23.74 23.74 0 011.014 5.395" />
        </svg>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in">
      {/* Page header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Pengaturan</h2>
        <p className="text-sm text-slate-500 mt-0.5">Konfigurasi dan preferensi sistem</p>
      </div>

      <div className="flex flex-col">
        {/* Navigation Tabs - Horizontal */}
        <div className="w-full overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 hide-scrollbar mb-6">
          <nav className="flex gap-2 md:gap-4 w-full min-w-max md:min-w-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-2 p-3 md:px-4 md:py-4 rounded-xl border-2 transition-all min-w-[100px] md:min-w-0 ${
                  activeTab === tab.id
                    ? 'border-baby-500 bg-baby-50 text-baby-700 shadow-sm'
                    : 'border-transparent bg-white hover:bg-gray-50 text-gray-600 hover:border-gray-200 shadow-sm'
                }`}
              >
                <div className={`p-2 rounded-lg ${activeTab === tab.id ? 'bg-baby-100 text-baby-600' : 'bg-gray-100 text-gray-500'}`}>
                  {tab.icon}
                </div>
                <span className="text-xs md:text-sm font-medium whitespace-nowrap">
                  {tab.label}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="card p-6">
          {activeTab === 'profile' && <KustomStrukSettings />}
          {activeTab === 'users' && <UsersSettings />}
          {activeTab === 'pos' && <POSSettings />}
          {activeTab === 'inventory' && <InventorySettings />}
          {activeTab === 'system' && <SystemSettings />}
        </div>
      </div>
    </div>
  );
}

function KustomStrukSettings() {
  const [formData, setFormData] = useState({
    storeName: 'Sumber Baby Shop',
    storeAddress: 'Jl. Raya Bayi No. 123, Kota Balita',
    storePhone: '0812-3456-7890',
    footerTitle: 'TERIMA KASIH',
    footerSub: 'SELAMAT BELANJA KEMBALI',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const s = data.data;
          setFormData({
            storeName: s['store.name'] || 'Sumber Baby Shop',
            storeAddress: s['store.address'] || 'Jl. Raya Bayi No. 123, Kota Balita',
            storePhone: s['store.phone'] || '0812-3456-7890',
            footerTitle: s['receipt.footer_title'] || 'TERIMA KASIH',
            footerSub: s['receipt.footer_sub'] || 'SELAMAT BELANJA KEMBALI',
          });
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');
    try {
      const payload = {
        'store.name': formData.storeName,
        'store.address': formData.storeAddress,
        'store.phone': formData.storePhone,
        'receipt.footer_title': formData.footerTitle,
        'receipt.footer_sub': formData.footerSub,
      };

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Kustomisasi struk berhasil disimpan!');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        alert(data.message || 'Gagal menyimpan kustomisasi');
      }
    } catch (err) {
      alert('Terjadi kesalahan saat menyimpan kustomisasi');
    } finally {
      setIsSaving(false);
    }
  };

  const dummyItems = [
    { name: 'SGM Bunda 200g', price: 3200000, quantity: 2, discount: 0, subtotal: 6400000 },
    { name: 'Pampers Premium S 48', price: 10900000, quantity: 1, discount: 900000, subtotal: 10000000 },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Kustom Struk</h3>
          <p className="text-xs text-slate-500 mt-1">
            Kustomisasi informasi dan pesan struk fisik yang dicetak untuk pelanggan.
          </p>
        </div>
        {successMsg && (
          <span className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 font-medium animate-fade-in flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            <span>{successMsg}</span>
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-slate-500">Memuat pengaturan struk...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Form Kustomisasi (Left side) */}
          <form onSubmit={handleSave} className="md:col-span-7 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Toko</label>
              <input
                type="text"
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:border-baby-500 focus:ring-1 focus:ring-baby-500 outline-none transition-all"
                placeholder="Contoh: Sumber Baby Shop"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Toko</label>
              <textarea
                rows={2}
                value={formData.storeAddress}
                onChange={(e) => setFormData({ ...formData, storeAddress: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:border-baby-500 focus:ring-1 focus:ring-baby-500 outline-none transition-all"
                placeholder="Jl. Raya Bayi No. 123, Kota Balita"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor HP / WhatsApp Toko</label>
              <input
                type="text"
                value={formData.storePhone}
                onChange={(e) => setFormData({ ...formData, storePhone: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:border-baby-500 focus:ring-1 focus:ring-baby-500 outline-none transition-all"
                placeholder="0812-3456-7890"
              />
            </div>

            <div className="pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">Pesan Footer Struk</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Baris Footer 1</label>
                  <input
                    type="text"
                    value={formData.footerTitle}
                    onChange={(e) => setFormData({ ...formData, footerTitle: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:border-baby-500 focus:ring-1 focus:ring-baby-500 outline-none transition-all"
                    placeholder="TERIMA KASIH"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Baris Footer 2</label>
                  <input
                    type="text"
                    value={formData.footerSub}
                    onChange={(e) => setFormData({ ...formData, footerSub: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:border-baby-500 focus:ring-1 focus:ring-baby-500 outline-none transition-all"
                    placeholder="SELAMAT BELANJA KEMBALI"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-baby-600 text-white text-sm font-semibold rounded-lg hover:bg-baby-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-baby-500 disabled:opacity-50 transition-all shadow-sm flex items-center gap-2"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>

          {/* Live Preview Struk (Right side) */}
          <div className="md:col-span-5 flex flex-col items-center">
            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center sticky top-4">
              <div className="flex items-center gap-2 mb-3 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <svg className="w-4 h-4 text-baby-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview Tampilan Struk
              </div>

              {/* Thermal Receipt Visual Container (Width fixed to ~300px thermal size) */}
              <div className="bg-white w-full max-w-[310px] p-4 shadow-md rounded-lg border border-slate-200 relative">
                <ReceiptContent
                  storeName={formData.storeName}
                  storeAddress={formData.storeAddress}
                  storePhone={formData.storePhone}
                  receiptNumber="TRX-20260808-0001"
                  cashierName="Ahmad (Kasir)"
                  timestamp={new Date()}
                  items={dummyItems}
                  subtotal={16400000}
                  totalDiscount={900000}
                  totalNett={15500000}
                  paymentAmount={20000000}
                  changeAmount={4500000}
                  footerTitle={formData.footerTitle}
                  footerSub={formData.footerSub}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-3 text-center">
                *Preview diperbarui secara otomatis saat input diubah.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UsersSettings() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    pin: '',
    role: 'kasir',
    isActive: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      fullName: '',
      pin: '',
      role: 'kasir',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      fullName: user.fullName,
      pin: '',
      role: user.role,
      isActive: user.isActive,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      
      const payload: any = {
        fullName: formData.fullName,
        role: formData.role,
        isActive: formData.isActive,
      };
      if (!editingUser) {
        payload.username = formData.username;
        payload.pin = formData.pin;
      } else if (formData.pin) {
        payload.pin = formData.pin;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        closeModal();
        fetchUsers();
      } else {
        alert(data.message || 'Gagal menyimpan pengguna');
      }
    } catch (error) {
      alert('Terjadi kesalahan sistem');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Anda yakin ingin menonaktifkan pengguna ini?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchUsers();
      } else {
        alert(data.message || 'Gagal menonaktifkan pengguna');
      }
    } catch (error) {
      alert('Terjadi kesalahan sistem');
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Manajemen Pengguna</h3>
          <p className="text-xs text-slate-500 mt-1">Kelola akun staf dan hak akses sistem.</p>
        </div>
        <button type="button" onClick={openAddModal} className="px-3 py-1.5 bg-baby-50 text-baby-700 text-sm font-medium rounded-md hover:bg-baby-100">
          + Tambah Pengguna
        </button>
      </div>

      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="text-center py-8 text-sm text-slate-500">Memuat pengguna...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3">Peran</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(user => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">{user.fullName}</td>
                  <td className="px-4 py-3 text-slate-600">{user.username}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      user.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.isActive ? (
                       <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Aktif</span>
                    ) : (
                       <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">Nonaktif</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button onClick={() => openEditModal(user)} className="text-baby-600 hover:text-baby-900 text-xs font-medium">Edit</button>
                    {user.isActive && (
                      <button onClick={() => handleDeactivate(user.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Nonaktifkan</button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-4 text-center text-slate-500">Belum ada pengguna.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">{editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nama Lengkap</label>
                <input required type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm" />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">User ID</label>
                  <input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">{editingUser ? 'PIN Baru (kosongi jika tidak diubah)' : 'PIN (6 digit)'}</label>
                <input required={!editingUser} type="password" inputMode="numeric" maxLength={6} pattern="\d{6}" title="PIN harus 6 digit angka" value={formData.pin} onChange={e => { const digits = e.target.value.replace(/\D/g, '').slice(0, 6); setFormData({...formData, pin: digits}); }} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="••••••" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Peran (Role)</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm">
                  <option value="kasir">Kasir</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              {editingUser && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
                  <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Akun Aktif</label>
                </div>
              )}
              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 border rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 bg-baby-600 text-white rounded-md text-sm font-medium hover:bg-baby-700 disabled:opacity-50">
                  {isSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function POSSettings() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h3 className="text-base font-semibold text-slate-800">POS & Struk</h3>
        <p className="text-xs text-slate-500 mt-1">Konfigurasi meja kasir dan format cetak struk.</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
          <div>
            <h4 className="text-sm font-medium text-slate-800">Cetak Struk Otomatis</h4>
            <p className="text-xs text-slate-500 mt-0.5">Langsung mencetak struk setelah transaksi berhasil disimpan.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-baby-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-baby-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
          <div>
            <h4 className="text-sm font-medium text-slate-800">Pajak / PPN Default (%)</h4>
            <p className="text-xs text-slate-500 mt-0.5">Besaran pajak yang akan otomatis ditambahkan ke tagihan.</p>
          </div>
          <div className="w-24">
            <input type="number" className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white text-right" defaultValue="11" />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
          <div>
            <h4 className="text-sm font-medium text-slate-800">Format Printer Thermal</h4>
            <p className="text-xs text-slate-500 mt-0.5">Pilih ukuran kertas yang digunakan pada printer thermal kasir.</p>
          </div>
          <select className="px-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white">
            <option>58mm (Kecil)</option>
            <option>80mm (Besar)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function InventorySettings() {
  const [settings, setSettings] = useState({
    'inventory.near_expiry_days': '180',
    'inventory.slow_moving_days': '60',
    'discount.near_expiry_pct': '10',
    'discount.slow_moving_pct': '5',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setSettings(prev => ({ ...prev, ...data.data }));
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        alert('Pengaturan berhasil disimpan');
      } else {
        alert('Gagal menyimpan pengaturan');
      }
    } catch (err) {
      alert('Terjadi kesalahan saat menyimpan pengaturan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h3 className="text-base font-semibold text-slate-800">Pengaturan Diskon Otomatis</h3>
        <p className="text-xs text-slate-500 mt-1">Konfigurasi parameter waktu dan persentase untuk diskon otomatis POS.</p>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-slate-500">Memuat pengaturan...</div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-slate-800">Parameter Mendekati Kedaluwarsa (Hari)</h4>
              <p className="text-xs text-slate-500 mt-0.5">Batas hari sebelum expired dimana produk akan otomatis mendapat diskon.</p>
            </div>
            <div className="w-24">
              <input type="number" value={settings['inventory.near_expiry_days']} onChange={e => handleChange('inventory.near_expiry_days', e.target.value)} className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white text-right focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-slate-800">Diskon Mendekati Kedaluwarsa (%)</h4>
              <p className="text-xs text-slate-500 mt-0.5">Persentase diskon untuk produk mendekati kedaluwarsa.</p>
            </div>
            <div className="w-24">
              <input type="number" value={settings['discount.near_expiry_pct']} onChange={e => handleChange('discount.near_expiry_pct', e.target.value)} className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white text-right focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-slate-800">Parameter Lambat Terjual (Hari)</h4>
              <p className="text-xs text-slate-500 mt-0.5">Batas hari produk tidak terjual dimana akan otomatis mendapat diskon.</p>
            </div>
            <div className="w-24">
              <input type="number" value={settings['inventory.slow_moving_days']} onChange={e => handleChange('inventory.slow_moving_days', e.target.value)} className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white text-right focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-slate-800">Diskon Lambat Terjual (%)</h4>
              <p className="text-xs text-slate-500 mt-0.5">Persentase diskon untuk produk lambat terjual.</p>
            </div>
            <div className="w-24">
              <input type="number" value={settings['discount.slow_moving_pct']} onChange={e => handleChange('discount.slow_moving_pct', e.target.value)} className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white text-right focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-brand-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue disabled:opacity-50 transition-colors shadow-sm">
              {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SystemSettings() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h3 className="text-base font-semibold text-slate-800">Sistem & Data</h3>
        <p className="text-xs text-slate-500 mt-1">Manajemen database, backup, dan pengaturan sistem lainnya.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
          <div className="flex items-center gap-3 mb-3">
             <svg className="w-6 h-6 text-baby-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            <h4 className="text-sm font-medium text-slate-800">Backup Data</h4>
          </div>
          <p className="text-xs text-slate-500 mb-4">Unduh salinan cadangan dari seluruh data produk, transaksi, dan pengaturan ke perangkat Anda.</p>
          <button className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50">
            Buat File Backup
          </button>
        </div>

        <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
          <div className="flex items-center gap-3 mb-3">
             <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            <h4 className="text-sm font-medium text-slate-800">Restore Data</h4>
          </div>
          <p className="text-xs text-slate-500 mb-4">Pulihkan data dari file backup yang pernah Anda buat sebelumnya. Tindakan ini akan menimpa data saat ini.</p>
          <button className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50">
            Pilih File Restore
          </button>
        </div>
      </div>
    </div>
  );
}

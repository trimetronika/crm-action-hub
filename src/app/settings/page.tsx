"use client";

import React, { useState, useEffect } from 'react';
import { Settings, Save, ArrowLeft, Info, LogOut } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { MemoryManager } from '../components/MemoryManager';

export default function SettingsPage() {
  const router = useRouter();
  const [geminiKey, setGeminiKey] = useState("");
  const [aiModel, setAiModel] = useState("gemini-3.6-flash");
  const [templatePath, setTemplatePath] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
            if (data.geminiKey !== undefined) setGeminiKey(data.geminiKey);
            if (data.aiModel) setAiModel(data.aiModel);
            if (data.templatePath) setTemplatePath(data.templatePath);
            setLoading(false);
        })
        .catch(err => {
            toast.error("Gagal memuat pengaturan");
            setLoading(false);
        });
  }, []);

  const saveSettings = async () => {
      const loadingToast = toast.loading("Menyimpan pengaturan...");
      try {
          const res = await fetch('/api/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ geminiKey, aiModel, templatePath })
          });
          const data = await res.json();
          if (data.success) {
              toast.success("Pengaturan berhasil disimpan", { id: loadingToast });
          } else {
              toast.error(data.error || "Gagal menyimpan", { id: loadingToast });
          }
      } catch (err) {
          toast.error("Kesalahan jaringan", { id: loadingToast });
      }
  };

  const handleLogout = async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
  };

  const [localChatKeys, setLocalChatKeys] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
      // Find local storage keys
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('crm_chat_')) {
              keys.push(key);
          }
      }
      // Wrap in setTimeout to avoid synchronous setState in effect
      setTimeout(() => setLocalChatKeys(keys), 0);
  }, []);

  const handleImportLegacy = async () => {
      setIsImporting(true);
      const loadingToast = toast.loading("Mengimpor data lokal ke Cloud...");
      try {
          const payload = localChatKeys.map(key => {
              const companyName = key.replace('crm_chat_', '');
              let messages = [];
              try { messages = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e){}
              return { companyName, messages };
          });

          const res = await fetch('/api/legacy-import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chats: payload })
          });

          const data = await res.json();
          if (data.success) {
              toast.success(`Berhasil mengimpor ${data.importedCount} pesan ke Database!`, { id: loadingToast });
              // Clear from local storage
              localChatKeys.forEach(key => localStorage.removeItem(key));
              setLocalChatKeys([]);
          } else {
              toast.error("Gagal mengimpor: " + data.error, { id: loadingToast });
          }
      } catch (error) {
          toast.error("Terjadi kesalahan sistem saat impor.", { id: loadingToast });
      } finally {
          setIsImporting(false);
      }
  };

  if (loading) {
      return (
        <div className="flex-1 bg-gray-50 dark:bg-slate-950 flex items-center justify-center text-gray-500 dark:text-slate-400 transition-colors">
          <div className="animate-pulse">Memuat pengaturan...</div>
        </div>
      );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-950 font-sans transition-colors relative">
        <Toaster position="bottom-right" />
        
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-10 px-6 py-4 flex items-center justify-between transition-colors shadow-sm">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => router.back()}
                    className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-all active:scale-95"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                        <Settings className="text-blue-600 dark:text-blue-400" size={20} />
                    </div>
                    <div>
                        <h1 className="font-bold text-xl text-gray-800 dark:text-slate-100">Pengaturan Workspace</h1>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Konfigurasi Database Server.</p>
                    </div>
                </div>
            </div>
            
            <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition-colors text-sm font-semibold"
            >
                <LogOut size={16} /> Keluar (Logout)
            </button>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {localChatKeys.length > 0 && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center shadow-sm">
                    <div className="flex gap-3">
                        <Info className="text-orange-600 dark:text-orange-400 shrink-0 mt-1" size={24} />
                        <div>
                            <h3 className="font-semibold text-orange-800 dark:text-orange-300">Data Lokal Terdeteksi</h3>
                            <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                                Kami mendeteksi riwayat chat lama di peramban ini untuk {localChatKeys.length} prospek. Karena kita sudah menggunakan sistem Cloud, klik tombol di samping untuk memindahkannya ke Database Server agar tidak hilang.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={handleImportLegacy}
                        disabled={isImporting}
                        className="shrink-0 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
                    >
                        {isImporting ? 'Mengimpor...' : 'Impor ke Database'}
                    </button>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 space-y-6 transition-colors">
                
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex gap-3">
                    <Info className="text-blue-600 dark:text-blue-400 shrink-0" size={24} />
                    <div>
                        <h3 className="font-semibold text-blue-800 dark:text-blue-300">Privasi & Kredensial</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                            Username dan Password Absenku Anda kini dikelola secara otomatis melalui sesi Login (Server-Side). Anda dapat mengganti sesi dengan melakukan Logout.
                        </p>
                    </div>
                </div>

                <div className="border-b border-gray-100 dark:border-slate-800 pb-4 pt-4">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-200">Integrasi AI Copilot</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Atur kunci API dan model Gemini untuk memfasilitasi penulisan draf otomatis.</p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Gemini AI API Key</label>
                        <input type="password" value={geminiKey} onChange={e=>setGeminiKey(e.target.value)} placeholder="AIzaSy..." className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition font-mono" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Pilih Model AI (Engine)</label>
                        <select value={aiModel} onChange={e=>setAiModel(e.target.value)} className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition">
                            <option value="gemini-3.7-flash" className="bg-white dark:bg-slate-800">Gemini 3.7 Flash (Sangat Cepat & Terbaru)</option>
                            <option value="gemini-3.6-flash" className="bg-white dark:bg-slate-800">Gemini 3.6 Flash (Stabil - Rekomendasi)</option>
                            <option value="gemini-3.5-flash-lite" className="bg-white dark:bg-slate-800">Gemini 3.5 Flash Lite (Kuota Besar: 500 Req/Hari)</option>
                            <option value="gemini-3.1-pro" className="bg-white dark:bg-slate-800">Gemini 3.1 Pro (Lebih Cerdas & Detail)</option>
                        </select>
                    </div>
                </div>

                <div className="border-b border-gray-100 dark:border-slate-800 pb-4 pt-6">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-200">Konfigurasi Dokumen</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Atur *path* referensi untuk *template* surat lokal Anda.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Lokasi Default Template Docx (SPH)</label>
                    <textarea value={templatePath} onChange={e=>setTemplatePath(e.target.value)} rows={3} className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-xs transition leading-relaxed" />
                </div>

                <div className="border-b border-gray-100 dark:border-slate-800 pb-4 pt-6">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-200">Memori Personalisasi AI</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Gunakan *Meta Chatroom* atau *Floating Widget* untuk memberikan instruksi permanen ke AI.</p>
                    <MemoryManager />
                </div>

            </div>

            {/* Actions */}
            <div className="flex justify-end pt-2 pb-12">
                <button 
                    onClick={saveSettings} 
                    className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 transition-all active:scale-95"
                >
                    <Save size={18} /> Simpan Pengaturan
                </button>
            </div>
        </div>
    </div>
  );
}


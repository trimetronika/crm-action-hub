"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const loadingToast = toast.loading("Memverifikasi kredensial...");
        
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            
            if (data.success) {
                toast.success("Login berhasil!", { id: loadingToast });
                router.push('/');
                router.refresh();
            } else {
                toast.error(data.error || "Gagal masuk", { id: loadingToast });
            }
        } catch (err: any) {
            toast.error("Terjadi kesalahan jaringan", { id: loadingToast });
        }
        setLoading(false);
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-slate-950">
            <Toaster position="bottom-right" />
            <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900 shadow-xl rounded-2xl border border-gray-100 dark:border-slate-800">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center mb-4">
                        <Lock className="text-blue-600 dark:text-blue-400" size={28} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Masuk ke CRM</h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-2 text-center">
                        Gunakan username dan password portal Absenku Anda untuk melanjutkan.
                    </p>
                </div>
                
                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Username Absenku</label>
                        <input 
                            type="text" 
                            required
                            value={username} 
                            onChange={e => setUsername(e.target.value)} 
                            className="w-full border border-gray-300 dark:border-slate-700 rounded-xl p-3 text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-blue-500 transition" 
                            placeholder="Ketik username Anda"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Password</label>
                        <input 
                            type="password" 
                            required
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            className="w-full border border-gray-300 dark:border-slate-700 rounded-xl p-3 text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-blue-500 transition" 
                            placeholder="••••••••"
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-70 disabled:active:scale-100 mt-4 flex justify-center items-center gap-2"
                    >
                        {loading ? 'Memverifikasi...' : 'Masuk Sekarang'}
                    </button>
                </form>
            </div>
        </div>
    );
}

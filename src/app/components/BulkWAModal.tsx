"use client";
import React, { useState } from 'react';
import { X, Send, Bot, CheckCircle, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-hot-toast';
import { Lead } from './types';

import { useLeads } from '../context/LeadsContext';

interface BulkWAModalProps {
    selectedLeads: Lead[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function BulkWAModal({ selectedLeads, onClose, onSuccess }: BulkWAModalProps) {
    const { refreshLeads } = useLeads();
    const [instruction, setInstruction] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [results, setResults] = useState<{leadId: string, draft: string}[]>([]);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleGenerate = async () => {
        if (!instruction.trim()) {
            toast.error('Mohon masukkan tujuan pesan massal.');
            return;
        }

        setIsGenerating(true);
        try {
            const res = await fetch('/api/generate-bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leads: selectedLeads,
                    context: instruction
                })
            });
            const data = await res.json();
            if (data.success) {
                setResults(data.drafts);
                toast.success('Draf massal berhasil dibuat dan disimpan ke riwayat obrolan!');
                
                // Silent refresh in the background to update the inbox
                refreshLeads();
            } else {
                toast.error('Gagal membuat draf massal.');
            }
        } catch (error) {
            console.error(error);
            toast.error('Terjadi kesalahan jaringan.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyText = (leadId: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(leadId);
        setTimeout(() => setCopiedId(null), 2000);
        toast.success("Draf berhasil disalin!");
    };

    const handleOpenWA = (lead: Lead | undefined, text: string) => {
        if (!lead) return;
        const num = lead['Telepon'] || lead.telepon;
        if (!num) {
            toast.error('Nomor telepon tidak tersedia.');
            return;
        }
        const phone = num.replace(/\D/g, '');
        const finalPhone = phone.startsWith('0') ? '62' + phone.substring(1) : phone;
        const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
        
        // Save history logic could be added here if needed
    };

    return (
        <div role="dialog" aria-modal="true" aria-labelledby="modal-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-slate-800">
                {/* Header */}
                <div className="flex justify-between items-start p-6 border-b border-gray-100 dark:border-slate-800 shrink-0">
                    <div>
                        <h2 id="modal-title" className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-1">Draft WA Massal</h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400">Meracik pesan personal untuk {selectedLeads.length} prospek sekaligus.</p>
                    </div>
                    <button 
                        onClick={onClose}
                        aria-label="Tutup modal"
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-gray-500 dark:text-slate-400"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                    {results.length === 0 ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Instruksi Pesan Massal</label>
                                <textarea
                                    value={instruction}
                                    onChange={(e) => setInstruction(e.target.value)}
                                    placeholder="Contoh: Tawarkan promo spesial kemerdekaan diskon 17% untuk layanan kebersihan, dan tanyakan ketersediaan waktu untuk meeting minggu depan."
                                    className="w-full h-32 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-xl p-4 text-sm text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-shadow"
                                />
                            </div>
                            
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/50 flex gap-3 text-sm text-blue-800 dark:text-blue-300">
                                <Bot className="shrink-0 mt-0.5" size={18} />
                                <p>AI akan otomatis menyesuaikan nama sapaan, nama perusahaan, dan konteks tahapan untuk masing-masing {selectedLeads.length} prospek agar tidak terlihat seperti pesan robot.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
                                <CheckCircle size={20} />
                                <span>Berhasil membuat {results.length} draf pesan.</span>
                            </div>
                            <div className="space-y-4">
                                {results.map((r, i) => {
                                    const lead = selectedLeads.find(l => l.id === r.leadId) || selectedLeads[i];
                                    const companyName = lead?.['Nama Perusahaan'] || lead?.namaPerusahaan;
                                    return (
                                        <div key={i} className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                                            <div className="bg-gray-50 dark:bg-slate-800 px-4 py-2 border-b border-gray-200 dark:border-slate-700 font-medium text-sm text-gray-700 dark:text-slate-300 flex justify-between items-center">
                                                <span>{companyName}</span>
                                            </div>
                                            <div className="p-4 text-sm text-gray-800 dark:text-slate-200 prose prose-sm dark:prose-invert max-w-none">
                                                <ReactMarkdown>{r.draft}</ReactMarkdown>
                                            </div>
                                            <div className="p-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-2">
                                                <button 
                                                    onClick={() => handleCopyText(r.leadId, r.draft)}
                                                    className="px-4 py-1.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 text-sm font-medium rounded-lg flex items-center gap-2 transition-all active:scale-95 shadow-sm"
                                                >
                                                    {copiedId === r.leadId ? <Check size={14} className="text-green-600" /> : <Copy size={14} />} 
                                                    {copiedId === r.leadId ? "Tersalin" : "Salin"}
                                                </button>
                                                <button 
                                                    onClick={() => handleOpenWA(lead, r.draft)}
                                                    className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-all active:scale-95 shadow-sm"
                                                >
                                                    <Send size={14} /> Buka WA
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {results.length === 0 && (
                    <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3">
                        <button 
                            onClick={onClose}
                            className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all active:scale-95"
                        >
                            Batal
                        </button>
                        <button 
                            onClick={handleGenerate}
                            disabled={isGenerating || !instruction.trim()}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-sm shadow-blue-600/20"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Menganalisis...
                                </>
                            ) : (
                                <>
                                    <Bot size={18} /> Racik Pesan Massal
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}


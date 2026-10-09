"use client";

import React, { useState, useEffect, useMemo, useLayoutEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, RefreshCw, Search, Filter, X, Download } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

import { Lead } from './components/types';
import SummaryCards from './components/SummaryCards';
import LeadsTable from './components/LeadsTable';
import FloatingCopilot from './components/FloatingCopilot';
import SyncPreviewModal from './components/SyncPreviewModal';
import BulkWAModal from './components/BulkWAModal';
import { useLeads } from './context/LeadsContext';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function Dashboard() {
    const router = useRouter();
    const { leads, setLeads, refreshLeads, isLoading } = useLeads();
    const [loadingSync, setLoadingSync] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);
    const [isCommitting, setIsCommitting] = useState(false);
    
    // Filters and UI state
    const [filterStage, setFilterStage] = useState("All");
    const [filterMonth, setFilterMonth] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [syncStart, setSyncStart] = useState("");
    const [syncEnd, setSyncEnd] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: keyof Lead, direction: 'asc'|'desc' } | null>(null);
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  
    // Modals state
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [density, setDensity] = useState<'compact' | 'standard' | 'comfortable'>('standard');
    const [showBulkWAModal, setShowBulkWAModal] = useState(false);

    // Sync filters with session storage (use layout effect to avoid visual jump)
    useIsomorphicLayoutEffect(() => {
        const savedStage = sessionStorage.getItem('crm_filterStage');
        const savedMonth = sessionStorage.getItem('crm_filterMonth');
        const savedSearch = sessionStorage.getItem('crm_searchQuery');
        const savedDensity = sessionStorage.getItem('crm_density');
        const savedSort = sessionStorage.getItem('crm_sortConfig');

        if (savedStage) setFilterStage(savedStage);
        if (savedMonth) setFilterMonth(savedMonth);
        if (savedSearch) setSearchQuery(savedSearch);
        if (savedDensity) setDensity(savedDensity as any);
        if (savedSort) {
            try {
                setSortConfig(JSON.parse(savedSort));
            } catch (e) {}
        }
        
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const ym = `${now.getFullYear()}-${month}`;
        setSyncStart(ym);
        setSyncEnd(ym);
    }, []);

    const handleToggleSelect = (leadName: string) => {
        setSelectedLeads(prev => 
            prev.includes(leadName) 
                ? prev.filter(n => n !== leadName)
                : [...prev, leadName]
        );
    };

    const handleSelectAll = (selectAll: boolean, displayedLeadNames: string[]) => {
        if (selectAll) {
            const newSelected = new Set([...selectedLeads, ...displayedLeadNames]);
            setSelectedLeads(Array.from(newSelected));
        } else {
            setSelectedLeads(prev => prev.filter(name => !displayedLeadNames.includes(name)));
        }
    };

    const handleBulkDelete = () => {
        const newLeads = leads.filter(l => !selectedLeads.includes(l['Nama Perusahaan']));
        setLeads(newLeads);
        toast.success(`${selectedLeads.length} prospek berhasil dihapus`);
        setSelectedLeads([]);
        setShowDeleteConfirm(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws) as Lead[];
            
            const currentLeads = [...leads];
            let newCount = 0;
            let updateCount = 0;
            
            data.forEach(incoming => {
                const idx = currentLeads.findIndex(l => l['Nama Perusahaan'].toLowerCase() === incoming['Nama Perusahaan']?.toLowerCase());
                if(idx !== -1) {
                    currentLeads[idx] = { ...currentLeads[idx], ...incoming };
                    updateCount++;
                } else {
                    currentLeads.push(incoming);
                    newCount++;
                }
            });
            setLeads(currentLeads);
            toast.success(`Import selesai: ${newCount} prospek baru, ${updateCount} diperbarui`);
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    const handleCommitImport = async () => {
        setIsCommitting(true);
        const loadingToast = toast.loading("Menyimpan data...");
        try {
            const res = await fetch('/api/import/commit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(previewData) // previewData is the payload itself (newRows, updateRows, missingIds)
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`Berhasil menyimpan ${previewData.leads.length} leads!`, { id: loadingToast });
                setPreviewData(null);
                refreshLeads();
            } else {
                throw new Error(data.error);
            }
        } catch (e: any) {
            toast.error(e.message || "Gagal menyimpan data", { id: loadingToast });
        } finally {
            setIsCommitting(false);
        }
    };

    const handleSyncAbsenku = async () => {
        setLoadingSync(true);
        const loadingToast = toast.loading("Sinkronisasi latar belakang sedang berjalan...");
        
        try {
            const res = await fetch('/api/sync/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ start: syncStart, end: syncEnd })
            });
            const responseData = await res.json();
            
            if(res.status === 409) {
                setPreviewData(responseData);
                toast.dismiss(loadingToast);
                setLoadingSync(false);
                return;
            }
            
            if (responseData.success) {
                toast.success(`Berhasil mensinkronisasi data periode ${syncStart} - ${syncEnd}`, { id: loadingToast });
                refreshLeads();
            } else {
                throw new Error(responseData.error);
            }
        } catch (e: any) {
            toast.error(e.message || "Gagal menghubungi server Absenku", { id: loadingToast });
        } finally {
            setLoadingSync(false);
        }
    };

    const handleExportExcel = () => {
        if (processedLeads.length === 0) {
            toast.error("Tidak ada data untuk diekspor");
            return;
        }
        const worksheet = XLSX.utils.json_to_sheet(processedLeads.map(l => ({
            "Nama Perusahaan": l['Nama Perusahaan'] || l.namaPerusahaan,
            "PIC": l.PIC || l.pic,
            "Telepon": l.Telepon || l.telepon,
            "Layanan": l.Layanan || l.layanan,
            "Tahapan": l.Tahapan || l.tahapan,
            "Bulan": l.Bulan || l.bulan,
            "Nilai Deal": l['Nilai Deal'] || l.nilaiDeal || 0,
            "Catatan": l.Catatan || l.catatan,
            "Email": l.Email || l.email,
            "Update Terakhir": l['Last Updated'] || l.updateTerakhir
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data_Leads");
        XLSX.writeFile(workbook, `Data_Leads_Absenku_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Berhasil mengekspor data ke Excel");
    };

    const handleUpdateField = (leadName: string, field: keyof Lead, value: any) => {
        const leadToUpdate = leads.find(l => l['Nama Perusahaan'] === leadName);
        
        setLeads(prev => prev.map(l => {
            if (l['Nama Perusahaan'] === leadName) {
                return { ...l, [field]: value };
            }
            return l;
        }));
        
        if (leadToUpdate && leadToUpdate.id) {
            if (field === 'Email' || field === 'Catatan' || field === 'NextFollowUpDate') {
                fetch('/api/leads', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        id: leadToUpdate.id, 
                        email: field === 'Email' ? value : leadToUpdate.Email, 
                        catatan: field === 'Catatan' ? value : leadToUpdate.Catatan,
                        nextFollowUpDate: field === 'NextFollowUpDate' ? value : leadToUpdate.NextFollowUpDate
                    })
                }).catch(console.error);
            }
        }
    };

    const requestSort = (key: keyof Lead) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        const newSortConfig = { key, direction };
        setSortConfig(newSortConfig);
        sessionStorage.setItem('crm_sortConfig', JSON.stringify(newSortConfig));
    };

    const stageOrder = ['Leads', 'Prospect', 'Hot Prospect', 'PO', 'Failed'];
    const allStages = Array.from(new Set(leads.map(l => l.Tahapan))).filter(Boolean).sort((a, b) => {
        const idxA = stageOrder.indexOf(a);
        const idxB = stageOrder.indexOf(b);
        const rankA = idxA !== -1 ? idxA : 999;
        const rankB = idxB !== -1 ? idxB : 999;
        if (rankA !== rankB) return rankA - rankB;
        return a.localeCompare(b);
    });
    const allMonths = Array.from(new Set(leads.map(l => l.Bulan))).filter(Boolean).sort().reverse();
    
    // Helper untuk mengubah string relatif waktu (Bahasa Indonesia) menjadi angka representasi milidetik yang lalu.
    const parseRelativeTime = (timeStr: string): number => {
        if (!timeStr) return 9999999999999; // Sangat lama / unknown
        const s = timeStr.toLowerCase();
        
        if (s.includes('baru saja') || s.includes('just now')) return 0;
        if (s.includes('kemarin')) return 1 * 24 * 60 * 60 * 1000;
        
        const match = s.match(/(\d+)\s+(detik|menit|jam|hari|minggu|bulan|tahun)/);
        if (match) {
            const value = parseInt(match[1], 10);
            const unit = match[2];
            let multiplier = 1;
            
            switch (unit) {
                case 'detik': multiplier = 1000; break;
                case 'menit': multiplier = 60 * 1000; break;
                case 'jam': multiplier = 60 * 60 * 1000; break;
                case 'hari': multiplier = 24 * 60 * 60 * 1000; break;
                case 'minggu': multiplier = 7 * 24 * 60 * 60 * 1000; break;
                case 'bulan': multiplier = 30 * 24 * 60 * 60 * 1000; break;
                case 'tahun': multiplier = 365 * 24 * 60 * 60 * 1000; break;
            }
            return value * multiplier;
        }
        
        return 9999999999999; // Fallback untuk teks yang tidak dikenali
    };

    const processedLeads = useMemo(() => {
        let filtered = leads.filter(l => {
            if (filterStage !== "All" && l.Tahapan !== filterStage) return false;
            if (filterMonth !== "All" && l.Bulan !== filterMonth) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return (l['Nama Perusahaan'] && l['Nama Perusahaan'].toLowerCase().includes(q)) || (l.PIC && l.PIC.toLowerCase().includes(q));
            }
            return true;
        });

        if (sortConfig) {
            filtered.sort((a, b) => {
                const aVal = a[sortConfig.key] || "";
                const bVal = b[sortConfig.key] || "";
                
                if (sortConfig.key === 'Tahapan') {
                    const idxA = stageOrder.indexOf(aVal as string);
                    const idxB = stageOrder.indexOf(bVal as string);
                    const rankA = idxA !== -1 ? idxA : 999;
                    const rankB = idxB !== -1 ? idxB : 999;
                    
                    if (rankA !== rankB) {
                        return sortConfig.direction === 'asc' ? rankA - rankB : rankB - rankA;
                    }
                }

                if (sortConfig.key === 'Last Updated') {
                    const timeA = parseRelativeTime(aVal as string);
                    const timeB = parseRelativeTime(bVal as string);
                    return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA;
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }, [leads, filterStage, filterMonth, searchQuery, sortConfig]);

    return (
        <>
            <Toaster position="bottom-right" />
            
            {previewData && (
                <SyncPreviewModal
                    previewData={previewData}
                    isSubmitting={isCommitting}
                    onConfirm={handleCommitImport}
                    onCancel={() => setPreviewData(null)}
                />
            )}

            {showBulkWAModal && (
                <BulkWAModal
                    selectedLeads={leads.filter(l => selectedLeads.includes(l['Nama Perusahaan']))}
                    onClose={() => {
                        setShowBulkWAModal(false);
                        setSelectedLeads([]);
                        refreshLeads();
                    }} 
                    onSuccess={() => {}}
                />
            )}

            <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8 w-full relative">
                <div className="max-w-7xl mx-auto">
                    <SummaryCards leads={processedLeads} />

                    {/* Action Toolbar */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 transition-colors">
                        <div className="flex flex-col gap-2">
                            <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">Periode Sinkronisasi Absenku</span>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                                <input type="month" value={syncStart} onChange={e => setSyncStart(e.target.value)} className="border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 transition" />
                                <span className="text-gray-400 font-medium">sd</span>
                                <input type="month" value={syncEnd} onChange={e => setSyncEnd(e.target.value)} className="border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 transition" />
                            </div>
                        </div>
                        
                        <div className="flex gap-3">
                            <button 
                                onClick={handleExportExcel}
                                disabled={processedLeads.length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Download size={18} className="text-gray-500 dark:text-slate-400" /> 
                                <span className="text-sm font-medium">Export CSV</span>
                            </button>
                            <button 
                                onClick={handleSyncAbsenku}
                                disabled={loadingSync}
                                className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition active:scale-95 ${loadingSync ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                <RefreshCw size={18} className={loadingSync ? "animate-spin" : ""} /> 
                                <span className="hidden md:inline">{loadingSync ? 'Sinkronisasi...' : 'Smart Sync'}</span>
                            </button>
                            <label className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border border-gray-300 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition shadow-sm active:scale-95">
                                <Upload size={18} className="text-gray-500 dark:text-slate-400" />
                                <span className="text-sm font-medium">Import Excel</span>
                                <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
                            </label>
                        </div>
                    </div>

                    {/* Data Table Section */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 flex flex-col mb-8 transition-colors">
                        <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-900 gap-4 z-10 relative rounded-t-xl transition-colors">
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="relative flex-1 md:w-72">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search size={16} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        aria-label="Search leads"
                                        className="block w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg leading-5 bg-gray-50 dark:bg-slate-800 placeholder-gray-500 dark:placeholder-slate-400 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition sm:text-sm"
                                        placeholder="Cari perusahaan atau PIC..."
                                        value={searchQuery}
                                        onChange={e => {
                                            setSearchQuery(e.target.value);
                                            sessionStorage.setItem('crm_searchQuery', e.target.value);
                                        }}
                                    />
                                </div>
                                <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm transition focus-within:ring-2 focus-within:ring-blue-500">
                                    <Filter size={16} className="text-gray-500 dark:text-slate-400" />
                                    <select 
                                        aria-label="Filter Bulan"
                                        className="bg-transparent focus:outline-none text-gray-700 dark:text-slate-200 font-medium w-full"
                                        value={filterMonth}
                                        onChange={(e) => {
                                            setFilterMonth(e.target.value);
                                            sessionStorage.setItem('crm_filterMonth', e.target.value);
                                        }}
                                    >
                                        <option value="All" className="bg-white dark:bg-slate-800 dark:text-slate-200">Bulan: Semua</option>
                                        {allMonths.map(m => (
                                            <option key={m} value={m} className="bg-white dark:bg-slate-800 dark:text-slate-200">{m}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm transition focus-within:ring-2 focus-within:ring-blue-500">
                                    <Filter size={16} className="text-gray-500 dark:text-slate-400" />
                                    <select 
                                        aria-label="Filter Tahapan"
                                        className="bg-transparent focus:outline-none text-gray-700 dark:text-slate-200 font-medium w-full"
                                        value={filterStage}
                                        onChange={(e) => {
                                            setFilterStage(e.target.value);
                                            sessionStorage.setItem('crm_filterStage', e.target.value);
                                        }}
                                    >
                                        <option value="All" className="bg-white dark:bg-slate-800 dark:text-slate-200">Semua Tahapan</option>
                                        {allStages.map(stage => (
                                            <option key={stage} value={stage} className="bg-white dark:bg-slate-800 dark:text-slate-200">{stage}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-lg p-1 border border-gray-200 dark:border-slate-700">
                                    {(['compact', 'standard', 'comfortable'] as const).map(d => (
                                        <button
                                            key={d}
                                            aria-label={`Mode Tampilan ${d}`}
                                            onClick={() => {
                                                setDensity(d);
                                                sessionStorage.setItem('crm_density', d);
                                            }}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all active:scale-95 ${density === d ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="text-sm font-medium flex items-center gap-4">
                                {leads.length > 0 && (
                                    <>
                                        <span className="text-xs text-gray-500 dark:text-slate-400 hidden lg:inline">
                                            {leads[0]?.lastSync ? `Terakhir disinkronisasi: ${new Date(leads[0].lastSync).toLocaleString('id-ID')}` : 'Sinkronisasi siap'}
                                        </span>
                                        <button onClick={() => setShowClearConfirm(true)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-3 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 transition-all active:scale-95 text-xs font-semibold">
                                            Clear Data
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        
                        {/* Selected actions */}
                        {selectedLeads.length > 0 && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-3 flex justify-between items-center border-b border-blue-100 dark:border-blue-900/50">
                                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                                    {selectedLeads.length} prospek dipilih
                                </span>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setShowBulkWAModal(true)}
                                        className="text-xs font-semibold px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                                    >
                                        Draft WA Massal
                                    </button>
                                    <button onClick={() => setShowDeleteConfirm(true)} className="text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 px-3 py-1.5 rounded-md transition">
                                        Hapus
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Onboarding State */}
                        {processedLeads.length === 0 && !isLoading && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 p-6 text-blue-800 dark:text-blue-300">
                                <h3 className="text-lg font-bold mb-2">Selamat Datang di CRM Absenku!</h3>
                                <p className="mb-4 text-sm">Sepertinya data leads Anda masih kosong. Anda dapat memulai dengan:</p>
                                <ul className="list-disc list-inside space-y-2 text-sm mb-4">
                                    <li>Klik tombol <strong>Smart Sync</strong> di atas untuk menarik data terbaru dari server Absenku (Kanban).</li>
                                    <li>Gunakan <strong>Import Excel</strong> untuk memasukkan data prospek yang sudah ada dari spreadsheet Anda.</li>
                                    <li>Jika sudah ada data, klik tombol <strong>Follow Up</strong> pada baris data untuk membuat draft WhatsApp otomatis melalui AI yang kemudian bisa Anda kirim secara manual.</li>
                                </ul>
                            </div>
                        )}

                        <LeadsTable  
                            leads={processedLeads} 
                            selectedLeads={selectedLeads}
                            onToggleSelect={handleToggleSelect}
                            onSelectAll={(s) => handleSelectAll(s, processedLeads.map(l => l['Nama Perusahaan']))}
                            onFollowUp={(lead) => router.push(`/copilot?id=${encodeURIComponent(lead.id || '')}`)}
                            onUpdateField={handleUpdateField}
                            density={density}
                            requestSort={requestSort}
                            
                            
                        />
                    </div>
                </div>
              <FloatingCopilot />
            </main>

            {/* Clear All Confirmation Modal */}
            {showClearConfirm && (
                <div role="dialog" aria-modal="true" aria-labelledby="clear-title" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-slate-800">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <X size={32} className="text-red-600 dark:text-red-400" />
                            </div>
                            <h3 id="clear-title" className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-2">Reset Database</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400">
                                Apakah Anda yakin ingin menghapus <strong>seluruh {leads.length} data</strong> dari sistem lokal? Data ini tidak dapat dikembalikan.
                            </p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-slate-800 flex gap-3">
                            <button 
                                onClick={() => setShowClearConfirm(false)}
                                className="flex-1 px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-200 font-medium hover:bg-gray-50 dark:hover:bg-slate-600 transition-all active:scale-95"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={() => {
                                    setLeads([]);
                                    setSelectedLeads([]);
                                    setShowClearConfirm(false);
                                    toast.success("Seluruh data berhasil dihapus");
                                }}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all active:scale-95 shadow-sm shadow-red-500/20"
                            >
                                Ya, Hapus Semua
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Bulk Delete Modal */}
            {showDeleteConfirm && (
                <div role="dialog" aria-modal="true" aria-labelledby="bulk-delete-title" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-slate-800">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <X size={32} className="text-red-600 dark:text-red-400" />
                            </div>
                            <h3 id="bulk-delete-title" className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-2">Hapus Prospek</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400">
                                Apakah Anda yakin ingin menghapus <strong>{selectedLeads.length} prospek</strong>?
                            </p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-slate-800 flex gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-200 font-medium hover:bg-gray-50 dark:hover:bg-slate-600 transition-all active:scale-95">
                                Batal
                            </button>
                            <button onClick={handleBulkDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all active:scale-95 shadow-sm shadow-red-500/20">
                                Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}






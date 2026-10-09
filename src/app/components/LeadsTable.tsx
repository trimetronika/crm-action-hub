import React, { useState } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight, MoreVertical, Search } from 'lucide-react';
import { Lead } from './types';
import { useAutoAnimate } from '@formkit/auto-animate/react';

interface LeadsTableProps {
  leads: Lead[];
  selectedLeads: string[];
  onToggleSelect: (leadName: string) => void;
  onSelectAll: (selectAll: boolean) => void;
  onFollowUp: (lead: Lead) => void;
  onUpdateField: (leadName: string, field: keyof Lead, value: string) => void;
  requestSort: (key: keyof Lead) => void;
  density?: 'compact' | 'standard' | 'comfortable';
  isLoading?: boolean;
}

export default function LeadsTable({ 
    leads, 
    selectedLeads, 
    onToggleSelect, 
    onSelectAll, 
    onFollowUp, 
    onUpdateField, 
    requestSort,
    density = 'standard',
    isLoading = false
}: LeadsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [parent] = useAutoAnimate();
  
  const totalPages = Math.ceil(leads.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const displayedLeads = leads.slice(startIndex, startIndex + rowsPerPage);

  const getPadding = () => {
      if (density === 'compact') return 'px-2 py-1.5';
      if (density === 'comfortable') return 'px-6 py-4';
      return 'px-4 py-3';
  };
  const pClass = getPadding();

  const getStageColor = (stage: string) => {
      const s = stage.toLowerCase();
      if (s.includes("lead") || s.includes("baru")) return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
      if (s.includes("hot") || s.includes("menunggu") || s.includes("panas")) return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
      if (s.includes("prospect") || s.includes("follow up")) return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
      if (s.includes("kalah") || s.includes("fail") || s.includes("batal")) return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
      if (s.includes("setuju") || s.includes("deal") || s.includes("win") || s.includes("po")) return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
      return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  };

  const isAllDisplayedSelected = displayedLeads.length > 0 && displayedLeads.every(l => selectedLeads.includes(l['Nama Perusahaan']));

  const isOverdue = (dateStr?: string) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      d.setHours(23, 59, 59, 999);
      return d < new Date();
  };

  const isToday = (dateStr?: string) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      const today = new Date();
      return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  return ( <div className="flex flex-col">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-slate-300 relative">
          <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 font-semibold shadow-sm sticky top-0 z-10">
            <tr>
              <th className={`${pClass} w-10`}>
                  <input type="checkbox" aria-label="Pilih Semua Baris" checked={isAllDisplayedSelected} onChange={(e) => onSelectAll(e.target.checked)} className="rounded border-gray-300 dark:border-slate-600 dark:bg-slate-700" />
              </th>
              <th className={`${pClass} w-12 text-center`}>#</th>
              <th className={`${pClass} w-28 whitespace-nowrap p-0`}>
                  <button aria-label="Sortir Bulan" aria-sort="none" onClick={() => requestSort('Bulan')} className="w-full flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-slate-700 p-3 outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 rounded">
                      Bulan <ArrowUpDown size={14} className="opacity-50" />
                  </button>
              </th>
              <th className={`${pClass} min-w-[200px] whitespace-nowrap p-0`}>
                  <button aria-label="Sortir Nama Perusahaan" aria-sort="none" onClick={() => requestSort('Nama Perusahaan')} className="w-full flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-slate-700 p-3 outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 rounded">
                      Nama Perusahaan <ArrowUpDown size={14} className="opacity-50" />
                  </button>
              </th>
              <th className={`${pClass} min-w-[150px] whitespace-nowrap p-0`}>
                  <button aria-label="Sortir Kontak" aria-sort="none" onClick={() => requestSort('PIC')} className="w-full flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-slate-700 p-3 outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 rounded">
                      Kontak <ArrowUpDown size={14} className="opacity-50" />
                  </button>
              </th>
              <th className={`${pClass} min-w-[150px] whitespace-nowrap p-0`}>
                  <button aria-label="Sortir Email" aria-sort="none" onClick={() => requestSort('Email')} className="w-full flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-slate-700 p-3 outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 rounded">
                      Email <ArrowUpDown size={14} className="opacity-50" />
                  </button>
              </th>
              <th className={`${pClass} min-w-[150px] whitespace-nowrap p-0`}>
                  <button aria-label="Sortir Jadwal" aria-sort="none" onClick={() => requestSort('NextFollowUpDate')} className="w-full flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-slate-700 p-3 outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 rounded">
                      Jadwal <ArrowUpDown size={14} className="opacity-50" />
                  </button>
              </th>
              <th className={`${pClass} min-w-[130px] whitespace-nowrap p-0`}>
                  <button aria-label="Sortir Tahapan" aria-sort="none" onClick={() => requestSort('Tahapan')} className="w-full flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-slate-700 p-3 outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 rounded">
                      Tahapan <ArrowUpDown size={14} className="opacity-50" />
                  </button>
              </th>
              <th className={`${pClass} min-w-[130px] whitespace-nowrap p-0`}>
                  <button aria-label="Sortir Nilai Deal" aria-sort="none" onClick={() => requestSort('Nilai Deal')} className="w-full flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-slate-700 p-3 outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 rounded">
                      Nilai Deal <ArrowUpDown size={14} className="opacity-50" />
                  </button>
              </th>
              <th className={`${pClass} min-w-[150px] whitespace-nowrap p-0`}>
                  <button aria-label="Sortir Update Terakhir" aria-sort="none" onClick={() => requestSort('Last Updated')} className="w-full flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-slate-700 p-3 outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 rounded">
                      Update Terakhir <ArrowUpDown size={14} className="opacity-50" />
                  </button>
              </th>
              <th className={`${pClass} min-w-[200px] text-gray-700 dark:text-slate-200 whitespace-nowrap`}>
                  Catatan Internal
              </th>
              <th className={`${pClass} min-w-[120px] text-center whitespace-nowrap`}>Aksi</th>
            </tr>
          </thead>
          <tbody ref={parent} className="bg-white dark:bg-slate-800 divide-y divide-gray-100 dark:divide-slate-700/50">
            {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="animate-pulse">
                        <td className={`${pClass}`}><div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-4"></div></td>
                        <td className={`${pClass}`}><div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-4 mx-auto"></div></td>
                        <td className={`${pClass}`}><div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-16"></div></td>
                        <td className={`${pClass}`}><div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div></td>
                        <td className={`${pClass}`}>
                            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>
                            <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-2/3"></div>
                        </td>
                        <td className={`${pClass}`}><div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-full"></div></td>
                        <td className={`${pClass}`}><div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-full"></div></td>
                        <td className={`${pClass}`}><div className="h-6 bg-gray-200 dark:bg-slate-700 rounded-full w-20"></div></td>
                        <td className={`${pClass}`}>
                            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-20 mb-2"></div>
                            <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-24"></div>
                        </td>
                        <td className={`${pClass}`}><div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24"></div></td>
                        <td className={`${pClass}`}><div className="h-12 bg-gray-200 dark:bg-slate-700 rounded w-full"></div></td>
                        <td className={`${pClass}`}><div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-full"></div></td>
                    </tr>
                ))
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                            <Search size={28} className="text-gray-400 dark:text-slate-500" />
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-slate-200">Belum ada data prospek.</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-sm">Coba sesuaikan filter bulan dan tahapan, atau tarik data terbaru dari Absenku.</p>
                    </div>
                </td>
              </tr>
            ) : (
              displayedLeads.map((lead, idx) => {
                const rowIsOverdue = isOverdue(lead.NextFollowUpDate);
                const rowIsToday = isToday(lead.NextFollowUpDate);
                let rowBg = "hover:bg-blue-50 dark:hover:bg-slate-700/80 transition group";
                if (rowIsOverdue) rowBg = "bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition group border-l-2 border-red-500";
                else if (rowIsToday) rowBg = "bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition group border-l-2 border-yellow-500";

                return (
                <tr key={lead['Nama Perusahaan']} className={rowBg}>
                  <td className={`${pClass} text-center`}>
                    <input 
                        type="checkbox" 
                        checked={selectedLeads.includes(lead['Nama Perusahaan'])}
                        onChange={() => onToggleSelect(lead['Nama Perusahaan'])}
                        className="rounded border-gray-300 dark:border-slate-600 dark:bg-slate-700" 
                    />
                  </td>
                  <td className={`${pClass} text-center font-mono text-xs text-gray-400 dark:text-slate-500`}>{startIndex + idx + 1}</td>
                  <td className={`${pClass} whitespace-nowrap`}><span className="px-2 py-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded text-xs text-gray-600 dark:text-slate-300 font-medium shadow-sm">{lead.Bulan}</span></td>
                  <td className={`${pClass} font-bold text-gray-900 dark:text-slate-100`}>{lead['Nama Perusahaan']}</td>
                  <td className={`${pClass}`}>
                      <div className="font-semibold text-gray-800 dark:text-slate-200">{lead.PIC || '-'}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400 tabular-nums">{lead.Telepon}</div>
                  </td>
                  <td className={`${pClass} text-sm text-gray-700`}>
                      <input type="email" aria-label={`Email ${lead['Nama Perusahaan']}`} className="w-full p-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded outline-none bg-gray-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800 focus:ring-1 focus:ring-blue-400 transition dark:text-slate-200 focus:scale-[1.02] active:scale-95"
                          placeholder="Ketik email..."
                          value={lead.Email || ''}
                          onChange={(e) => onUpdateField(lead['Nama Perusahaan'], 'Email', e.target.value)}
                      />
                  </td>
                  <td className={`${pClass} text-sm`}>
                      <input type="date" aria-label={`Jadwal Follow Up ${lead['Nama Perusahaan']}`} className="w-full p-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded outline-none bg-gray-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800 focus:ring-1 focus:ring-blue-400 transition dark:text-slate-200 focus:scale-[1.02] active:scale-95"
                          value={lead.NextFollowUpDate || ''}
                          onChange={(e) => onUpdateField(lead['Nama Perusahaan'], 'NextFollowUpDate', e.target.value)}
                      />
                  </td>
                  <td className={`${pClass}`}>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStageColor(lead.Tahapan)}`}>
                      {lead.Tahapan}
                    </span>
                  </td>
                  <td className={`${pClass}`}>
                      <div className="text-gray-900 dark:text-slate-200 font-semibold tabular-nums">
                        {!lead['Nilai Deal'] || lead['Nilai Deal'] === 0 || lead['Nilai Deal'] === 0 
                          ? '-' 
                          : (typeof lead['Nilai Deal'] === 'number' 
                              ? `Rp ${lead['Nilai Deal'].toLocaleString('id-ID')}` 
                              : lead['Nilai Deal'])}
                      </div>
                      <div className="text-[10px] uppercase font-semibold text-gray-400 dark:text-slate-500 truncate w-32" title={lead.Layanan}>{lead.Layanan}</div>
                  </td>
                  <td className={`${pClass} text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap tabular-nums`}>
                      {lead['Last Updated'] || '-'}
                  </td>
                  <td className={`${pClass}`}>
                      <textarea aria-label={`Catatan ${lead['Nama Perusahaan']}`} className="w-full h-16 p-2 text-xs border border-gray-200 dark:border-slate-600 rounded outline-none resize-none bg-gray-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800 focus:ring-1 focus:ring-blue-400 transition dark:text-slate-200 focus:scale-[1.02]"
                          placeholder="Ketik catatan..."
                          value={lead.Catatan || ''}
                          onChange={(e) => onUpdateField(lead['Nama Perusahaan'], 'Catatan', e.target.value)}
                      />
                  </td>
                  <td className={`${pClass} text-center`}>
                    <button 
                      onClick={() => onFollowUp(lead)}
                      className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-white border border-blue-200 rounded shadow-sm hover:bg-blue-50 hover:border-blue-300 transition-all active:scale-95 w-full sm:w-auto dark:bg-slate-800 dark:border-slate-600 dark:text-blue-400 dark:hover:bg-slate-700"
                    >
                      Follow Up
                    </button>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden flex flex-col gap-4 p-4 bg-gray-50 dark:bg-slate-950">
        {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
                <div key={`mob-skel-${i}`} className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-slate-800 animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-3"></div>
                    <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-2"></div>
                </div>
            ))
        ) : leads.length === 0 ? (
            <div className="text-center p-8 text-gray-500">Tidak ada data</div>
        ) : (
            displayedLeads.map((lead, idx) => (
                <div key={lead['Nama Perusahaan']} className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-slate-800 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                            <input 
                                type="checkbox" 
                                aria-label={`Pilih ${lead['Nama Perusahaan']}`}
                                checked={selectedLeads.includes(lead['Nama Perusahaan'])}
                                onChange={() => onToggleSelect(lead['Nama Perusahaan'])}
                                className="mt-1 rounded border-gray-300 dark:border-slate-600 dark:bg-slate-700 w-4 h-4" 
                            />
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-slate-100 text-base">{lead['Nama Perusahaan']}</h3>
                                <div className="text-sm text-gray-600 dark:text-slate-400">{lead.PIC || "-"} • {lead.Telepon}</div>
                            </div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStageColor(lead.Tahapan)}`}>
                            {lead.Tahapan}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-gray-100 dark:border-slate-800 pt-3">
                        <div>
                            <span className="text-gray-500 block mb-1">Nilai Deal</span>
                            <div className="font-semibold text-gray-800 dark:text-slate-200">
                                {!lead['Nilai Deal'] || lead['Nilai Deal'] === 0 || lead['Nilai Deal'] === 0 ? "-" : `Rp ${Number(lead['Nilai Deal']).toLocaleString('id-ID')}`}
                            </div>
                        </div>
                        <div>
                            <span className="text-gray-500 block mb-1">Layanan</span>
                            <div className="font-medium text-gray-800 dark:text-slate-200 truncate">{lead.Layanan}</div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 mt-2">
                        <input 
                            type="email"
                            aria-label="Email Prospek"
                            className="w-full p-2 text-sm border border-gray-200 dark:border-slate-600 rounded bg-gray-50 dark:bg-slate-800 outline-none dark:text-slate-200 focus:ring-1 focus:ring-blue-400"
                            placeholder="Email..."
                            value={lead.Email || ""}
                            onChange={(e) => onUpdateField(lead['Nama Perusahaan'], "Email", e.target.value)}
                        />
                        <textarea 
                            aria-label="Catatan Prospek"
                            className="w-full h-16 p-2 text-sm border border-gray-200 dark:border-slate-600 rounded bg-gray-50 dark:bg-slate-800 outline-none resize-none dark:text-slate-200 focus:ring-1 focus:ring-blue-400"
                            placeholder="Catatan..."
                            value={lead.Catatan || ""}
                            onChange={(e) => onUpdateField(lead['Nama Perusahaan'], "Catatan", e.target.value)}
                        />
                    </div>

                    <button 
                        onClick={() => onFollowUp(lead)}
                        aria-label={`Follow Up ${lead['Nama Perusahaan']}`}
                        className="mt-2 w-full px-4 py-2 text-sm font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg shadow-sm hover:bg-blue-100 transition-all active:scale-95 dark:bg-slate-800 dark:border-slate-600 dark:text-blue-400 dark:hover:bg-slate-700"
                    >
                        Follow Up / Aksi
                    </button>
                </div>
            ))
        )}
      </div>
      
      {/* Pagination Controls */}
      <div className="flex flex-col gap-4 sm:flex-row items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 sm:px-6 rounded-b-xl transition-colors">
        <div className="w-full sm:flex-1 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center justify-between sm:justify-start gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-2">
               <span className="text-sm text-gray-700 dark:text-slate-300">Baris per halaman:</span>
               <select 
                  className="border border-gray-300 dark:border-slate-700 rounded text-sm py-1 px-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 transition-colors active:scale-95"
                  value={rowsPerPage}
                  onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                  }}
               >
                   <option value={10} className="bg-white dark:bg-slate-800 dark:text-slate-200">10</option>
                   <option value={20} className="bg-white dark:bg-slate-800 dark:text-slate-200">20</option>
                   <option value={50} className="bg-white dark:bg-slate-800 dark:text-slate-200">50</option>
                   <option value={100} className="bg-white dark:bg-slate-800 dark:text-slate-200">100</option>
               </select>
            </div>
            <p className="text-sm text-gray-700 dark:text-slate-300 text-center sm:text-left tabular-nums">
              Menampilkan <span className="font-semibold">{leads.length > 0 ? startIndex + 1 : 0}</span> - <span className="font-semibold">{Math.min(startIndex + rowsPerPage, leads.length)}</span> dari <span className="font-semibold">{leads.length}</span>
            </p>
          </div>
          
          {totalPages > 1 && (
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-gray-500 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-all active:scale-95"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-gray-700 dark:text-slate-200 tabular-nums">
                  Hal {currentPage} dari {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-gray-500 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-all active:scale-95"
                >
                  <ChevronRight size={16} />
                </button>
              </nav>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}





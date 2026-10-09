import React from 'react';
import { AlertCircle, CheckCircle, ArrowRight, X } from 'lucide-react';

interface PreviewData {
    newRows: any[];
    updateRows: any[];
    missingIds: string[];
    invalidRows: any[];
    totalIncoming: number;
}

interface SyncPreviewModalProps {
    previewData: PreviewData;
    isSubmitting: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function SyncPreviewModal({ previewData, isSubmitting, onConfirm, onCancel }: SyncPreviewModalProps) {
    const hasIssues = previewData.invalidRows.length > 0;
    const totalChanges = previewData.newRows.length + previewData.updateRows.length + previewData.missingIds.length;

    return (
        <div role="dialog" aria-modal="true" aria-labelledby="sync-modal-title" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100">Pratinjau Sinkronisasi & Impor</h2>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                            Tinjau perubahan yang akan diterapkan ke CRM Anda.
                        </p>
                    </div>
                    <button 
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{previewData.newRows.length}</div>
                            <div className="text-xs font-medium text-blue-800 dark:text-blue-300">Data Baru</div>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{previewData.updateRows.length}</div>
                            <div className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Diperbarui</div>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/50 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{previewData.missingIds.length}</div>
                            <div className="text-xs font-medium text-orange-800 dark:text-orange-300">Diarsipkan</div>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{previewData.invalidRows.length}</div>
                            <div className="text-xs font-medium text-red-800 dark:text-red-300">Ditolak (Error)</div>
                        </div>
                    </div>

                    {/* Invalid Rows Warning */}
                    {hasIssues && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-4">
                            <h3 className="text-sm font-bold text-red-800 dark:text-red-300 flex items-center gap-2 mb-2">
                                <AlertCircle size={16} /> Beberapa baris data ditolak
                            </h3>
                            <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 list-disc pl-5">
                                {previewData.invalidRows.slice(0, 5).map((err, idx) => (
                                    <li key={idx}>Baris {err.rowNumber}: {err.reason}</li>
                                ))}
                                {previewData.invalidRows.length > 5 && (
                                    <li>...dan {previewData.invalidRows.length - 5} baris lainnya</li>
                                )}
                            </ul>
                            <p className="text-xs text-red-800 dark:text-red-300 mt-2 font-medium">Data yang ditolak akan diabaikan dan tidak akan merusak database utama.</p>
                        </div>
                    )}

                    {/* Highlights of Updates */}
                    {previewData.updateRows.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                Contoh Data Diperbarui
                            </h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                {previewData.updateRows.slice(0, 5).map((row, idx) => (
                                    <div key={idx} className="bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded p-2 text-xs">
                                        <span className="font-semibold text-gray-800 dark:text-slate-200">{row.namaPerusahaan}</span>
                                        {row._changes && row._changes.length > 0 && (
                                            <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                                                ({row._changes.join(', ')})
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {totalChanges === 0 && !hasIssues && (
                        <div className="text-center py-6 text-gray-500 dark:text-slate-400 text-sm">
                            Tidak ada perubahan terdeteksi. CRM Anda sudah sinkron dengan sumber data terbaru.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex justify-end gap-3">
                    <button 
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                    >
                        Batal
                    </button>
                    <button 
                        onClick={onConfirm}
                        disabled={isSubmitting || totalChanges === 0}
                        className={`flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow transition ${(isSubmitting || totalChanges === 0) ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                    >
                        {isSubmitting ? (
                            <span>Menyimpan...</span>
                        ) : (
                            <>
                                Konfirmasi & Simpan <CheckCircle size={16} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}


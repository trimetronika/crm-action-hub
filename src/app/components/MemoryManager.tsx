import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

export function MemoryManager() {
    const [memories, setMemories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadMemories = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/memory');
            if (res.ok) {
                setMemories(await res.json());
            }
        } catch (e) {}
        setLoading(false);
    };

    useEffect(() => {
        loadMemories();
    }, []);

    const deleteMemory = async (id: string) => {
        await fetch(`/api/memory?id=${id}`, { method: 'DELETE' });
        loadMemories();
    };

    if (loading) return <div className="text-sm text-gray-500">Memuat memori...</div>;

    return (
        <div className="space-y-3">
            {memories.length === 0 ? (
                <p className="text-sm text-gray-500">Belum ada memori AI yang tersimpan.</p>
            ) : (
                memories.map(m => (
                    <div key={m.id} className="flex justify-between items-center bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-100 dark:border-slate-700/50">
                        <span className="text-sm text-gray-700 dark:text-slate-300">{m.content}</span>
                        <button onClick={() => deleteMemory(m.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))
            )}
        </div>
    );
}

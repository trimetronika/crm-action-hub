"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Lead } from '../components/types';

interface LeadsContextType {
    leads: Lead[];
    setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
    refreshLeads: () => Promise<void>;
    isLoading: boolean;
}

const LeadsContext = createContext<LeadsContextType | null>(null);

export function LeadsProvider({ children }: { children: React.ReactNode }) {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refreshLeads = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/leads?t=' + Date.now(), { cache: 'no-store' });
            const data = await res.json();
            if (data.success && data.data) {
                const mappedLeads = data.data.map((lead: any) => ({
                    ...lead,
                    'Nama Perusahaan': lead.namaPerusahaan,
                    'PIC': lead.pic,
                    'Telepon': lead.telepon,
                    'Layanan': lead.layanan,
                    'Nilai Deal': lead.nilaiDeal,
                    'Tahapan': lead.tahapan,
                    'Bulan': lead.bulan,
                    'Email': lead.email,
                    'Catatan': lead.catatan,
                    'Last Updated': lead.updateTerakhir,
                    'NextFollowUpDate': lead.nextFollowUpDate,
                }));
                setLeads(mappedLeads);
            }
        } catch (e) {
            console.error('Failed to fetch leads:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshLeads();
    }, []);

    return (
        <LeadsContext.Provider value={{ leads, setLeads, refreshLeads, isLoading }}>
            {children}
        </LeadsContext.Provider>
    );
}

export function useLeads() {
    const context = useContext(LeadsContext);
    if (!context) {
        throw new Error('useLeads must be used within a LeadsProvider');
    }
    return context;
}

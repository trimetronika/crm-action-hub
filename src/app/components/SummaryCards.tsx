import React from 'react';
import { Lead } from './types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, DollarSign, Clock, AlertCircle } from 'lucide-react';

export default function SummaryCards({ leads }: { leads: Lead[] }) {
    const totalLeads = leads.length;

    const totalValue = leads.reduce((acc, lead) => {
        const val = lead['Nilai Deal'];
        if (typeof val === 'number') {
            return acc + val;
        }
        const strVal = String(val || '0').replace(/[^0-9]/g, '');
        return acc + (parseInt(strVal, 10) || 0);
    }, 0);

    const formatCurrency = (val: number) => {
        if (val === 0) return '-';
        return 'Rp ' + val.toLocaleString('id-ID');
    };

    const stageCounts: { [key: string]: number } = {};
    leads.forEach(l => {
        stageCounts[l.Tahapan] = (stageCounts[l.Tahapan] || 0) + 1;
    });

    const chartData = Object.keys(stageCounts).map(stage => ({
        name: stage,
        value: stageCounts[stage]
    })).sort((a,b) => b.value - a.value);

    // Calculate overdues
    const today = new Date();
    today.setHours(0,0,0,0);
    const overdues = leads.filter(l => {
        if (!l.NextFollowUpDate) return false;
        const d = new Date(l.NextFollowUpDate);
        return d < today;
    }).length;
    
    const todays = leads.filter(l => {
        if (!l.NextFollowUpDate) return false;
        const d = new Date(l.NextFollowUpDate);
        return d.getTime() === today.getTime();
    }).length;

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6', '#64748b'];

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">Total Leads</p>
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mt-1">{totalLeads}</h3>
                    </div>
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                        <Users size={20} />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">Estimasi Pipeline</p>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100 mt-1">{formatCurrency(totalValue)}</h3>
                    </div>
                    <div className="p-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                        <DollarSign size={20} />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">Tugas Follow Up</p>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100 mt-1">
                            <span className="text-red-500">{overdues}</span> <span className="text-sm text-gray-400 font-normal">Terlambat</span>
                        </h3>
                        <p className="text-xs text-orange-500 mt-1 font-medium">{todays} Jadwal Hari Ini</p>
                    </div>
                    <div className="p-2 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
                        <Clock size={20} />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 h-28">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Sebaran Tahapan</h4>
                <div className="h-20 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{top: 5, right: 5, left: -25, bottom: 0}}>
                            <XAxis dataKey="name" tick={{fontSize: 9}} hide />
                            <YAxis tick={{fontSize: 9}} hide />
                            <Tooltip contentStyle={{fontSize: '10px', padding: '4px', borderRadius: '4px'}} cursor={{fill: 'transparent'}} />
                            <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

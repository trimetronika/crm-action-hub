"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Database, Table, Bot, Settings } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function SideNav() {
    const pathname = usePathname();

    return (
        <div className="fixed bottom-0 left-0 right-0 w-full h-16 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 flex flex-row items-center justify-center z-[999] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:relative md:w-16 md:h-full md:border-t-0 md:border-r md:flex-col md:py-4 md:shadow-sm md:shrink-0 transition-colors">
            
            {/* Logo Section (Desktop Only) */}
            <div className="hidden md:flex w-10 h-10 bg-blue-600 rounded-xl items-center justify-center mb-8 shrink-0 shadow-sm">
                <Database className="text-white" size={20} />
            </div>

            {/* Nav Container for Both Mobile & Desktop */}
            <nav className="flex flex-row md:flex-col gap-8 md:gap-4 items-center justify-center md:justify-start w-full md:flex-1 md:w-auto px-4 md:px-0">
                <Link href="/" aria-label="Data Leads" className={`w-12 h-12 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 group ${pathname === '/' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 shadow-inner' : 'text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800'}`} title="Data Leads">
                    <Table size={24} className={`md:w-[22px] md:h-[22px] ${pathname === '/' ? '' : 'md:group-hover:scale-110 transition-transform'}`} />
                </Link>
                
                {/* Copilot Icon - Made Larger / Prominent on mobile */}
                <Link href="/copilot" aria-label="AI Copilot" className={`w-[60px] h-[60px] md:w-10 md:h-10 rounded-2xl md:rounded-xl flex items-center justify-center transition-all active:scale-95 group -translate-y-4 md:translate-y-0 shadow-lg md:shadow-none border-4 border-gray-50 md:border-none dark:border-slate-950 ${pathname === '/copilot' ? 'bg-blue-600 text-white shadow-blue-500/30' : 'bg-gradient-to-tr from-blue-500 to-indigo-500 text-white hover:opacity-90 md:bg-none md:bg-transparent md:text-gray-500 md:hover:bg-gray-100 md:dark:text-slate-400 md:dark:hover:bg-slate-800'}`} title="AI Copilot">
                    <Bot size={28} className={`md:w-[22px] md:h-[22px] ${pathname === '/copilot' ? '' : 'md:group-hover:scale-110 transition-transform'}`} />
                </Link>

                <Link 
                    href="/settings"
                    aria-label="Pengaturan"
                    className={`w-12 h-12 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 group ${pathname === '/settings' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 shadow-inner' : 'text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                    title="Pengaturan"
                >
                    <Settings size={24} className={`md:w-[22px] md:h-[22px] ${pathname === '/settings' ? '' : 'md:group-hover:rotate-45 transition-transform'}`} />
                </Link>
            </nav>

            <div className="hidden md:flex md:mt-auto">
                <ThemeToggle />
            </div>
        </div>
    );
}


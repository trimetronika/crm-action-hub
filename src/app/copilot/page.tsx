"use client";

import React, { useState, useEffect, useRef, Suspense, useLayoutEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Send, User, Bot, Clock, CheckCheck, FileText, ArrowLeft, MoreVertical, Building2, Search, MessageSquarePlus, X, Filter } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import { Lead } from '../components/types';
import ReactMarkdown from 'react-markdown';
import { useLeads } from '../context/LeadsContext';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: number;
    isSent?: boolean;
    status?: string;
}

interface InboxItem {
    lead: Lead;
    lastMessage: string;
    timestamp: number;
    draftCount: number;
}

function CopilotContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { leads, setLeads, isLoading } = useLeads();
    
    // Inbox and Chat state
    const [inboxList, setInboxList] = useState<InboxItem[]>([]);
    const [activeLead, setActiveLead] = useState<Lead | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Contacts Modal state
    const [showNewChat, setShowNewChat] = useState(false);
    const [contactSearch, setContactSearch] = useState("");
    const [contactStage, setContactStage] = useState("All");
    const [contactMonth, setContactMonth] = useState("All");
    
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    const [inboxSearch, setInboxSearch] = useState("");

    const buildInbox = (allLeads: Lead[]) => {
        const inbox: InboxItem[] = [];
        allLeads.forEach(lead => {
            if (lead.chatHistory) {
                try {
                    const msgs: ChatMessage[] = JSON.parse(lead.chatHistory);
                    if (msgs.length > 0) {
                        const lastMsg = msgs[msgs.length - 1];
                        const drafts = msgs.filter(m => m.role === 'model' && m.status !== 'SENT' && !m.isSent).length;
                        inbox.push({
                            lead: lead,
                            lastMessage: lastMsg.text,
                            timestamp: lastMsg.timestamp,
                            draftCount: drafts
                        });
                    }
                } catch (e) {
                    console.error("Failed to parse chatHistory for", lead['Nama Perusahaan']);
                }
            }
        });
        
        inbox.sort((a, b) => b.timestamp - a.timestamp);
        setInboxList(inbox);
    };
    
    const filteredInbox = inboxList.filter(item => 
        item.lead['Nama Perusahaan'].toLowerCase().includes(inboxSearch.toLowerCase())
    );

    const handleSelectLead = (lead: Lead | null) => {
        setActiveLead(lead);
        if (lead && lead.id === 'META_AI') {
            fetch('/api/meta-history?t=' + Date.now(), { cache: 'no-store' })
                .then(res => res.json())
                .then(saved => {
                    if (saved && Array.isArray(saved) && saved.length > 0) {
                        setMessages(saved);
                    } else {
                        setMessages([{ id: '1', role: 'model', text: 'Halo! Saya Absenku AI. Ada instruksi atau preferensi khusus yang ingin Anda terapkan secara permanen pada sistem?', timestamp: Date.now() }]);
                    }
                })
                .catch(() => {
                    setMessages([{ id: '1', role: 'model', text: 'Halo! Saya Absenku AI. Ada instruksi atau preferensi khusus yang ingin Anda terapkan secara permanen pada sistem?', timestamp: Date.now() }]);
                });
        } else if (lead && lead.chatHistory) {
            try {
                setMessages(JSON.parse(lead.chatHistory));
            } catch (e) {
                setMessages([]);
            }
        } else {
            setMessages([]);
        }

        if (lead && lead.id) {
            sessionStorage.setItem('crm_copilot_activeLead', lead.id);
        }
    };

    const saveHistory = (msgs: ChatMessage[]) => {
        if (activeLead && activeLead.id) {
            if (activeLead.id === 'META_AI') {
                fetch('/api/meta-history', { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ history: msgs }) });
                return;
            }
            
            // Update local state instantly
            const historyStr = JSON.stringify(msgs);
            
            const currentLeads = [...leads];
            const idx = currentLeads.findIndex(l => l.id === activeLead.id);
            if (idx !== -1) {
                currentLeads[idx].chatHistory = historyStr;
                setLeads(currentLeads);
                buildInbox(currentLeads);
            }
            
            // Sync to database
            fetch('/api/leads', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: activeLead.id, chatHistory: historyStr })
            }).catch(console.error);
        }
    };

    useEffect(() => {
        if (leads && leads.length > 0) {
            buildInbox(leads);
            
            const queryId = searchParams.get('id');
            const savedId = sessionStorage.getItem('crm_copilot_activeLead');
            
            // Only set active lead if we don't have one, or if URL forces a change
            if (!activeLead || (queryId && activeLead.id !== queryId)) {
                if(queryId) {
                    const target = leads.find((l: Lead) => l.id === queryId);
                    if(target) handleSelectLead(target);
                } else if (savedId) {
                    const target = leads.find((l: Lead) => l.id === savedId);
                    if(target) handleSelectLead(target);
                } else {
                    const queryLead = searchParams.get('lead');
                    if (queryLead) {
                        const target = leads.find((l: Lead) => l['Nama Perusahaan'] === queryLead);
                        if (target) handleSelectLead(target);
                    }
                }
            }
        }
    }, [leads, searchParams]);

    const prevMsgCountRef = useRef(0);
    const prevRoomIdRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        const isSameRoom = activeLead?.id === prevRoomIdRef.current;
        
        if (messagesContainerRef.current) {
            const container = messagesContainerRef.current;
            const msgDiff = messages.length - prevMsgCountRef.current;
            
            // Only smooth scroll if it's the exact same room, it's not the first load (prev != 0),
            // and the message diff is exactly 1 (meaning a new chat just arrived/sent).
            const isSingleNewMessage = isSameRoom && prevMsgCountRef.current !== 0 && msgDiff === 1;

            if (isSingleNewMessage) {
                // New single message -> smooth scroll
                container.style.scrollBehavior = 'smooth';
                container.scrollTop = container.scrollHeight;
            } else if (messages.length > 0) {
                // Room switch, or bulk history load (e.g. from 0 to 10 msgs) -> INSTANT snap
                container.style.scrollBehavior = 'auto'; // Disable CSS smooth scroll override
                container.scrollTop = container.scrollHeight;
            }
        }
        
        prevMsgCountRef.current = messages.length;
        prevRoomIdRef.current = activeLead?.id;
    }, [messages, activeLead]);

    const handleSend = async () => {
        if (!inputText.trim() || !activeLead) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: inputText,
            timestamp: Date.now()
        };

        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInputText("");
        setIsGenerating(true);
        saveHistory(newMessages);

        try {
            let validHistory = newMessages.filter(m => m.role === 'user' || m.role === 'model');
            
            while(validHistory.length > 0 && validHistory[0].role === 'model') {
                validHistory.shift();
            }

            const alternatingHistory: ChatMessage[] = [];
            for (const msg of validHistory) {
                if (alternatingHistory.length === 0) {
                    alternatingHistory.push(msg);
                } else {
                    const lastRole = alternatingHistory[alternatingHistory.length - 1].role;
                    if (msg.role !== lastRole) {
                        alternatingHistory.push(msg);
                    } else {
                        alternatingHistory[alternatingHistory.length - 1].text += "\n\n" + msg.text;
                    }
                }
            }

            const apiHistory = alternatingHistory.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

            const response = await fetch('/api/generate-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'chat',
                    leadData: activeLead,
                    message: inputText,
                    history: apiHistory.slice(0, -1)
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                const aiMsg: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'model',
                    text: data.text,
                    timestamp: Date.now(),
                    status: 'DRAFT'
                };
                const updatedMsgs = [...newMessages, aiMsg];
                setMessages(updatedMsgs);
                saveHistory(updatedMsgs);
            } else {
                toast.error(data.error || "Gagal membuat pesan");
            }
        } catch (error: any) {
            toast.error("Kesalahan jaringan: " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const updateMessageStatus = (msgId: string, status: string, isSent: boolean = false) => {
        const updatedMsgs = messages.map(m => {
            if (m.id === msgId) {
                return { ...m, status, isSent: isSent || m.isSent };
            }
            return m;
        });
        setMessages(updatedMsgs);
        saveHistory(updatedMsgs);
    };

    const confirmSent = (msgId: string) => {
        updateMessageStatus(msgId, 'SENT', true);
        toast.success("Dikonfirmasi! Tersimpan di riwayat sebagai Terkirim.");
    };

    const handleSendWA = (text: string, msgId: string) => {
        if (!activeLead?.Telepon) {
            toast.error("Nomor telepon tidak tersedia!");
            return;
        }
        let phone = activeLead.Telepon.replace(/\D/g, '');
        if (phone.startsWith('0')) phone = '62' + phone.substring(1);
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
        updateMessageStatus(msgId, 'OPENED_WA');
    };

    // Contacts Filter logic
    const uniqueMonths = ["All", ...Array.from(new Set(leads.map(l => l.Bulan).filter(Boolean))).sort((a, b) => b.localeCompare(a))];
    
    const stageOrder: Record<string, number> = {
        'Leads': 1,
        'Prospect': 2,
        'Hot Prospect': 3,
        'PO': 4,
        'Failed': 5
    };
    const uniqueStages = ["All", ...Array.from(new Set(leads.map(l => l.Tahapan).filter(Boolean))).sort((a, b) => {
        const orderA = stageOrder[a] || 99;
        const orderB = stageOrder[b] || 99;
        return orderA - orderB;
    })];
    
    const filteredContacts = leads.filter(l => {
        const matchesSearch = l['Nama Perusahaan'].toLowerCase().includes(contactSearch.toLowerCase()) || (l.PIC && l.PIC.toLowerCase().includes(contactSearch.toLowerCase()));
        const matchesStage = contactStage === "All" || l.Tahapan === contactStage;
        const matchesMonth = contactMonth === "All" || l.Bulan === contactMonth;
        return matchesSearch && matchesStage && matchesMonth;
    });

    return (
        <>
            <Toaster position="bottom-right" />

            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar Container */}
                <div className={`w-full md:w-80 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 shrink-0 transition-colors relative overflow-hidden flex-col ${activeLead ? 'hidden md:flex' : 'flex'}`}>
                    
                    {/* Inbox View */}
                    <div className={`absolute inset-0 flex flex-col transition-transform duration-300 ease-in-out bg-white dark:bg-slate-900 ${showNewChat ? '-translate-x-full' : 'translate-x-0'}`}>
                        {/* Inbox Header */}
                        <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex flex-col gap-3 bg-gray-50 dark:bg-slate-800/50">
                            <div className="flex justify-between items-center">
                                <h2 className="font-semibold text-gray-800 dark:text-slate-200">Inbox Chat</h2>
                                <button 
                                    onClick={() => setShowNewChat(true)}
                                    className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all active:scale-95"
                                    title="Mulai Chat Baru"
                                >
                                    <MessageSquarePlus size={18} />
                                </button>
                            </div>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="text"
                                    placeholder="Cari obrolan..."
                                    value={inboxSearch}
                                    onChange={(e) => setInboxSearch(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                                />
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto">
                            {isLoading ? (
                                <div className="p-4 space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="animate-pulse flex gap-3 items-center">
                                            <div className="w-10 h-10 bg-gray-200 dark:bg-slate-800 rounded-full shrink-0"></div>
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/2"></div>
                                                <div className="h-3 bg-gray-100 dark:bg-slate-800/50 rounded w-3/4"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <>
                                <button
                                    onClick={() => {
                                        const metaLead: any = {
                                            id: 'META_AI',
                                            'Nama Perusahaan': 'Absenku AI',
                                            PIC: 'Personal Assistant',
                                            Tahapan: 'AI Core',
                                            Bulan: '-'
                                        };
                                        handleSelectLead(metaLead);
                                    }}
                                    className={`w-full text-left p-4 border-b border-gray-100 dark:border-slate-800/80 transition flex justify-between items-center ${activeLead?.id === 'META_AI' ? 'bg-blue-50 dark:bg-slate-800' : 'hover:bg-gray-50 dark:hover:bg-slate-800/80'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
                                            <Bot size={20} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-blue-700 dark:text-blue-400">Absenku AI</div>
                                            <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Personal Assistant</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 ml-auto shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                                    </div>
                                </button>
                                {filteredInbox.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 px-6 text-center text-gray-500 dark:text-slate-400">
                                        <MessageSquarePlus size={40} className="mb-3 text-gray-300 dark:text-slate-700" />
                                        <p className="text-sm">Belum ada riwayat chat klien.</p>
                                    </div>
                                ) : (
                                    filteredInbox.map((item, index) => (
                                        <button
                                            key={`inbox-${item.lead['Nama Perusahaan']}-${index}`}
                                            onClick={() => handleSelectLead(item.lead)}
                                            className={`w-full text-left p-3.5 border-b border-gray-100 dark:border-slate-800/50 hover:bg-gray-50 dark:hover:bg-slate-800/80 transition ${activeLead?.['Nama Perusahaan'] === item.lead['Nama Perusahaan'] ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                                        >
                                            <div className="flex justify-between items-baseline mb-1">
                                                <div className={`truncate pr-2 flex-1 ${item.draftCount > 0 ? 'font-bold text-gray-900 dark:text-white' : 'font-semibold text-gray-800 dark:text-slate-200'}`}>{item.lead['Nama Perusahaan']}</div>
                                                <div className={`text-[10px] whitespace-nowrap tabular-nums ${item.draftCount > 0 ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-400'}`}>
                                                    {new Date(item.timestamp).toLocaleDateString() === new Date().toLocaleDateString() 
                                                        ? new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                                                        : new Date(item.timestamp).toLocaleDateString([], {day:'numeric', month:'short'})}
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center gap-2">
                                                <div className={`text-sm truncate ${item.draftCount > 0 ? 'text-gray-800 dark:text-slate-300 font-medium' : 'text-gray-500 dark:text-slate-400 opacity-80'}`}>{item.lastMessage}</div>
                                                {item.draftCount > 0 && (
                                                    <div className="w-5 h-5 flex items-center justify-center bg-blue-500 text-white text-[10px] font-bold rounded-full shrink-0 shadow-sm">
                                                        {item.draftCount}
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    ))
                                )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* New Chat (Contacts) View */}
                    <div className={`absolute inset-0 flex flex-col bg-white dark:bg-slate-900 z-10 transition-transform duration-300 ease-in-out ${showNewChat ? 'translate-x-0' : 'translate-x-full'}`}>
                        <div className="h-[68px] flex items-center px-4 gap-4 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                            <button 
                                onClick={() => setShowNewChat(false)}
                                className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-all active:scale-95"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <h2 className="font-semibold text-gray-800 dark:text-slate-200">Kontak Prospek</h2>
                        </div>
                        
                        {/* Filters */}
                        <div className="p-4 border-b border-gray-100 dark:border-slate-800 space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input 
                                    type="text"
                                    placeholder="Cari perusahaan atau PIC..."
                                    value={contactSearch}
                                    onChange={e => setContactSearch(e.target.value)}
                                    className="w-full bg-gray-100 dark:bg-slate-800 border-none rounded-lg pl-10 pr-4 py-2 text-sm text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition"
                                />
                            </div>
                            <div className="flex gap-2">
                                <select 
                                    className="flex-1 bg-gray-100 dark:bg-slate-800 border-none rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={contactStage}
                                    onChange={e => setContactStage(e.target.value)}
                                >
                                    {uniqueStages.map(s => <option key={s} value={s}>{s === 'All' ? 'Tahapan' : s}</option>)}
                                </select>
                                <select 
                                    className="flex-1 bg-gray-100 dark:bg-slate-800 border-none rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={contactMonth}
                                    onChange={e => setContactMonth(e.target.value)}
                                >
                                    {uniqueMonths.map(m => <option key={m} value={m}>{m === 'All' ? 'Bulan' : m}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Contact List */}
                        <div className="flex-1 overflow-y-auto">
                            {filteredContacts.length === 0 ? (
                                <div className="p-6 text-center text-gray-500 dark:text-slate-400 text-sm">
                                    Tidak ada kontak yang cocok dengan filter.
                                </div>
                            ) : (
                                filteredContacts.map((lead, idx) => (
                                    <button
                                        key={`contact-${lead['Nama Perusahaan']}-${idx}`}
                                        onClick={() => {
                                            handleSelectLead(lead);
                                            setShowNewChat(false);
                                        }}
                                        className="w-full text-left p-4 border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50 dark:hover:bg-slate-800/80 transition flex justify-between items-center"
                                    >
                                        <div>
                                            <div className="font-semibold text-gray-800 dark:text-slate-200">{lead['Nama Perusahaan']}</div>
                                            <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">{lead.PIC || '-'}</div>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-1">
                                            <span className="bg-gray-200 dark:bg-slate-700 px-2 py-0.5 rounded text-[10px] font-medium text-gray-700 dark:text-slate-300">{lead.Tahapan}</span>
                                            <span className="text-[10px] text-gray-400 tabular-nums">{lead.Bulan}</span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Area - Chat Room */}
                <div className={`flex-1 flex-col bg-[#F9FAFB] dark:bg-slate-950 relative transition-colors ${!activeLead ? 'hidden md:flex' : 'flex'}`}>
                    {activeLead ? (
                        <>
                            {/* Chat Header */}
                            <div className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 md:px-6 flex items-center justify-between shrink-0 transition-colors z-10 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => handleSelectLead(null)}
                                        className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition"
                                    >
                                        <ArrowLeft size={20} />
                                    </button>
                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                                        {activeLead.id === 'META_AI' ? (
                                            <Bot className="text-blue-600 dark:text-blue-400" size={20} />
                                        ) : (
                                            <Building2 className="text-blue-600 dark:text-blue-400" size={20} />
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="font-semibold text-gray-800 dark:text-slate-100 line-clamp-1">{activeLead['Nama Perusahaan']}</h2>
                                        <div className="text-xs text-gray-500 dark:text-slate-400 flex gap-2">
                                            <span>{activeLead.id === 'META_AI' ? 'Sistem' : `PIC: ${activeLead.PIC}`}</span>
                                        </div>
                                    </div>
                                </div>
                                {activeLead.id !== 'META_AI' && (
                                    <div className="text-sm font-bold text-gray-700 dark:text-slate-300 tabular-nums hidden sm:block">
                                        {activeLead['Nilai Deal'] ? `Rp ${Number(activeLead['Nilai Deal']).toLocaleString('id-ID')}` : '-'}
                                    </div>
                                )}
                            </div>

                            {/* Chat Messages */}
                            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6">
                                {messages.map((msg) => {
                                    const isSent = msg.status === 'SENT' || msg.isSent;
                                    const isDraft = !isSent;
                                    
                                    return (
                                        <div 
                                            key={msg.id} 
                                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                                                msg.role === 'user' 
                                                    ? 'bg-blue-600 text-white rounded-br-none' 
                                                    : activeLead.id === 'META_AI'
                                                        ? 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 rounded-bl-none'
                                                        : isSent
                                                            ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-gray-800 dark:text-slate-200 rounded-bl-none'
                                                            : 'bg-orange-50/50 dark:bg-orange-900/10 border border-orange-300 dark:border-orange-500/50 text-gray-800 dark:text-slate-200 rounded-bl-none shadow-orange-100 dark:shadow-none'
                                            }`}>
                                                {msg.role === 'model' && (
                                                    <div className="flex items-center gap-2 mb-2 text-xs font-medium text-blue-600 dark:text-blue-400 border-b border-gray-100 dark:border-slate-700 pb-2">
                                                        <Bot size={14} /> AI Assistant
                                                    </div>
                                                )}
                                                
                                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                                                </div>

                                                <div className={`text-[10px] mt-4 flex justify-between items-center ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                                                    <div className="flex items-center gap-2">
                                                        <span>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                        {msg.role === 'model' && !isSent && msg.status && activeLead.id !== 'META_AI' && (
                                                            <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-slate-700 rounded text-gray-600 dark:text-slate-300">
                                                                {msg.status === 'OPENED_WA' ? 'Dibuka di WA' : msg.status === 'COPIED' ? 'Disalin' : 'Draf Baru'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    {msg.role === 'model' && !isSent && activeLead.id !== 'META_AI' && (
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(msg.text);
                                                                    updateMessageStatus(msg.id, 'COPIED');
                                                                    toast.success("Disalin!");
                                                                }}
                                                                className="px-2 py-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded text-gray-600 dark:text-slate-300 font-medium transition"
                                                            >
                                                                Salin
                                                            </button>
                                                            <button 
                                                                onClick={() => handleSendWA(msg.text, msg.id)}
                                                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded font-medium shadow-sm transition"
                                                            >
                                                                Buka WA
                                                            </button>
                                                            {(msg.status === 'OPENED_WA' || msg.status === 'COPIED') && (
                                                                <button 
                                                                    onClick={() => confirmSent(msg.id)}
                                                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium shadow-sm transition animate-in fade-in"
                                                                >
                                                                    Tandai Terkirim
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {isGenerating && (
                                    <div className="flex justify-start">
                                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl rounded-bl-none p-4 shadow-sm flex items-center gap-2">
                                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Chat Input */}
                            <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 transition-colors flex justify-center">
                                <div className="w-full max-w-4xl flex items-end gap-2">
                                    <textarea 
                                        value={inputText}
                                        onChange={e => {
                                            setInputText(e.target.value);
                                            e.target.style.height = 'auto';
                                            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                                        }}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend();
                                            }
                                        }}
                                        rows={1}
                                        placeholder="Ketik instruksi atau minta AI membuat draf..."
                                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-colors shadow-sm"
                                        style={{ minHeight: '44px', maxHeight: '120px' }}
                                    />
                                    <button 
                                        onClick={() => {
                                            handleSend();
                                            const ta = document.querySelector('textarea');
                                            if (ta) ta.style.height = 'auto';
                                        }}
                                        disabled={isGenerating || !inputText.trim()}
                                        className="shrink-0 w-11 h-11 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-slate-700 text-white rounded-xl flex items-center justify-center transition shadow-sm"
                                    >
                                        <Send size={18} className="ml-1" />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-slate-400">
                            <Bot size={64} className="mb-4 text-blue-200 dark:text-blue-900/50" />
                            <h3 className="text-xl font-semibold mb-2">Pusat Diskusi Copilot</h3>
                            <p className="text-sm">Pilih percakapan di sebelah kiri atau mulai chat baru.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default function CopilotHub() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-100 dark:bg-slate-950"></div>}>
            <CopilotContent />
        </Suspense>
    );
}


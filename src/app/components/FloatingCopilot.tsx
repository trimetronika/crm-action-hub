import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Minimize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';

export default function FloatingCopilot() {
    const [isOpen, setIsOpen] = useState(false);
    const [inputText, setInputText] = useState("");
    const [messages, setMessages] = useState<any[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            fetch('/api/meta-history')
                .then(r => r.json())
                .then(d => {
                    if (Array.isArray(d) && d.length > 0) {
                        setMessages(d);
                    } else if (d && d.history && Array.isArray(d.history) && d.history.length > 0) {
                        setMessages(d.history);
                    } else {
                        const initial = [{ id: '1', role: 'model', text: 'Halo! Saya Absenku AI. Ada instruksi atau preferensi khusus yang ingin Anda terapkan secara permanen pada sistem?', timestamp: Date.now() }];
                        setMessages(initial);
                    }
                })
                .catch(e => {
                    const initial = [{ id: '1', role: 'model', text: 'Halo! Saya Absenku AI. Ada instruksi atau preferensi khusus yang ingin Anda terapkan secara permanen pada sistem?', timestamp: Date.now() }];
                    setMessages(initial);
                });
        }
    }, [isOpen, messages.length]);

    const prevMsgCountRef = useRef(0);
    const wasOpenRef = useRef(false);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && messagesContainerRef.current) {
            const container = messagesContainerRef.current;
            const isInitialLoad = !wasOpenRef.current || (prevMsgCountRef.current === 0 && messages.length > 0);
            
            if (isInitialLoad) {
                container.style.scrollBehavior = 'auto';
                container.scrollTop = container.scrollHeight;
            } else if (messages.length > prevMsgCountRef.current || isGenerating) {
                container.style.scrollBehavior = 'smooth';
                container.scrollTop = container.scrollHeight;
            }
        }
        wasOpenRef.current = isOpen;
        prevMsgCountRef.current = messages.length;
    }, [messages, isOpen, isGenerating]);

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const userMsg = { id: Date.now().toString(), role: 'user', text: inputText, timestamp: Date.now() };
        const newHistory = [...messages, userMsg];
        setMessages(newHistory);
        fetch('/api/meta-history', { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ history: newHistory }) });
        setInputText("");
        setIsGenerating(true);

        const validHistory = [...newHistory];
        while(validHistory.length > 0 && validHistory[0].role === 'model') {
            validHistory.shift(); 
        }

        const apiHistory = validHistory.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        try {
            const res = await fetch('/api/generate-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'chat',
                    leadData: { id: 'META_AI' },
                    message: inputText,
                    history: apiHistory.slice(0, -1)
                })
            });
            const data = await res.json();
            if (res.ok) {
                const finalHistory = [...newHistory, { id: Date.now().toString(), role: 'model', text: data.text, timestamp: Date.now() }];
                setMessages(finalHistory);
                fetch('/api/meta-history', { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ history: finalHistory }) });
            } else {
                toast.error(data.error || "Gagal memproses AI");
            }
        } catch (e) {
            console.error(e);
        }
        setIsGenerating(false);
    };

    return (
        <>
            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-8 md:right-10 w-[calc(100%-2rem)] max-w-[360px] h-[520px] max-h-[75vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-blue-900/10 dark:shadow-black/50 border border-gray-200 dark:border-slate-800 flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
                    <div className="h-14 bg-blue-600 flex items-center justify-between px-4 text-white shrink-0">
                        <div className="flex items-center gap-2">
                            <Bot size={20} />
                            <span className="font-semibold text-sm">Absenku AI</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/20 rounded transition" aria-label="Minimize">
                                <Minimize2 size={18} />
                            </button>
                        </div>
                    </div>

                    <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-slate-950">
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 border border-gray-200 dark:border-slate-700 rounded-bl-none'}`}>
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isGenerating && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl rounded-bl-none px-3.5 py-2.5 shadow-sm flex gap-1.5 items-center h-[38px]">
                                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800">
                        <div className="flex gap-2 items-end">
                            <textarea 
                                value={inputText}
                                onChange={e => {
                                    setInputText(e.target.value);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
                                }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="Ketik instruksi..."
                                rows={1}
                                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                style={{ minHeight: '38px', maxHeight: '100px' }}
                            />
                            <button 
                                onClick={handleSend}
                                disabled={isGenerating || !inputText.trim()}
                                className="shrink-0 w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-slate-700 text-white rounded-lg flex items-center justify-center transition mb-0.5"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Action Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-8 right-8 md:right-10 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-xl shadow-blue-600/30 transition-transform hover:scale-105 active:scale-95 z-50"
                title={isOpen ? undefined : "Buka Asisten AI"}
                aria-label={isOpen ? "Tutup Asisten AI" : "Buka Asisten AI"}
            >
                {isOpen ? <X size={28} className="animate-in spin-in-90 fade-in duration-200" /> : <Bot size={28} className="animate-in zoom-in fade-in duration-200" />}
            </button>
        </>
    );
}

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Send, 
  X, 
  Trash2, 
  Copy, 
  Check, 
  Loader2, 
  Maximize2, 
  Minimize2,
  Sparkles,
  BarChart3,
  FileSpreadsheet,
  Users,
  TrendingUp,
  Package
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for Tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface AIChatBoxProps {
  stats?: {
    invoices: any[];
    contracts: any[];
    partners: any[];
  };
}

const SUGGESTED_ACTIONS = [
  { id: 'revenue-today', label: 'Doanh thu hôm nay', icon: BarChart3, prompt: 'Hãy cho tôi biết tổng doanh thu hôm nay của các hóa đơn đã được xử lý.' },
  { id: 'recent-contracts', label: 'Hợp đồng mới nhất', icon: FileSpreadsheet, prompt: 'Tóm tắt các hợp đồng mới nhất được tạo trong hệ thống.' },
  { id: 'top-customers', label: 'Đối tác tiềm năng', icon: Users, prompt: 'Dựa trên danh sách đối tác, hãy gợi ý các đối tác có nhiều hóa đơn nhất.' },
  { id: 'revenue-summary', label: 'Phân tích doanh thu', icon: TrendingUp, prompt: 'Hãy phân tích tình hình doanh thu dựa trên các hóa đơn đã tải lên (tính tổng, trung bình...).' },
  { id: 'inventory', label: 'Thống kê loại hóa đơn', icon: Package, prompt: 'Hãy thống kê số lượng hóa đơn theo từng loại: Vật tư, Ca máy, Thi công.' },
];

export const AIChatBox: React.FC<AIChatBoxProps> = ({ stats }) => {
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
      const handleResize = () => {
        setDimensions({ width: window.innerWidth, height: window.innerHeight });
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatPanelRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen && 
        chatPanelRef.current && 
        !chatPanelRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('#ai-chat-trigger')
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (content?: string, customPrompt?: string) => {
    const messageText = content || input;
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Prepare context if it's a suggested action with stats
      let contextInfo = '';
      if (customPrompt && stats) {
        const statsSummary = {
          totalInvoices: stats.invoices.length,
          totalContracts: stats.contracts.length,
          totalPartners: stats.partners.length,
          recentInvoices: stats.invoices.slice(0, 10).map(i => ({
            number: i.extractedData?.invoice?.number,
            amount: i.totalAmount,
            seller: i.sellerName,
            category: i.category
          }))
        };
        contextInfo = `\nDữ liệu thống kê hiện tại: ${JSON.stringify(statsSummary)}`;
      }

      const payloadMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));

      // Inject context into the last message if available
      if (contextInfo) {
        payloadMessages[payloadMessages.length - 1].content += contextInfo;
      }

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: payloadMessages,
          stream: true
        }),
      });

      if (!response.ok) {
        let errorMsg = 'Network response was not ok';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
          if (errorData.systemLogs) {
            console.error('[SYSTEM_AI_ERROR_REPORT]', errorData.systemLogs);
          }
        } catch (e) {
          // Fallback if not JSON
        }
        throw new Error(errorMsg);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Could not get reader from response body');
      
      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantMessageId = (Date.now() + 1).toString();

      // Placeholder for assistant message
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;

            try {
              const data = JSON.parse(dataStr);
              const contentValue = data.choices?.[0]?.delta?.content || '';
              assistantContent += contentValue;
              
              setMessages(prev => prev.map(m => 
                m.id === assistantMessageId 
                  ? { ...m, content: assistantContent }
                  : m
              ));
            } catch (e) {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev.filter(m => m.content !== ''), {
        id: Date.now().toString(),
        role: 'assistant',
        content: `⚠️ **Lỗi kết nối AI:** ${error.message || 'Không xác định'}. Hệ thống đã ghi nhận lỗi vào log để kiểm tra.`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <>
      {/* Floating Button - Draggable */}
      <motion.button
        id="ai-chat-trigger"
        drag
        dragConstraints={{
          left: -dimensions.width + 80,
          right: 0,
          top: -dimensions.height + 140,
          bottom: 0
        }}
        dragElastic={0.05}
        dragMomentum={false}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 p-4 rounded-full shadow-2xl z-50 transition-colors cursor-grab active:cursor-grabbing select-none touch-none",
          "bg-indigo-600 hover:bg-indigo-700 text-white",
          isOpen && "hidden"
        )}
      >
        <Sparkles className="w-6 h-6" />
      </motion.button>

      {/* Side Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={chatPanelRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col border-l border-slate-200 dark:border-slate-800"
          >
            {/* Header */}
            <div className="p-4 border-bottom border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">AI Assistant</h3>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">Trực tuyến</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={clearChat}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
                  title="Xóa đoạn chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 px-8">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-2">
                    <MessageSquare className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h4 className="font-medium text-slate-900 dark:text-white text-lg">Chào bạn! Tôi có thể giúp gì cho bạn?</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Tôi là trợ lý ảo được tối ưu cho việc quản lý hóa đơn và dữ liệu. Hãy thử hỏi tôi về doanh thu hoặc xuất file báo cáo.
                  </p>
                  
                  <div className="w-full grid grid-cols-1 gap-2 mt-6">
                    {SUGGESTED_ACTIONS.map((action) => (
                      <button
                        key={action.id}
                        onClick={() => handleSend(action.label, action.prompt)}
                        className="flex items-center gap-3 p-3 text-left rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all text-sm group"
                      >
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 transition-colors">
                          <action.icon className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                        </div>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => (
                  <div 
                    key={m.id} 
                    className={cn(
                      "flex flex-col group",
                      m.role === 'user' ? "items-end" : "items-start"
                    )}
                  >
                    <div className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm relative",
                      m.role === 'user' 
                        ? "bg-indigo-600 text-white rounded-tr-none" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-700"
                    )}>
                      {m.role === 'assistant' && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleCopy(m.content, m.id)}
                            className="p-1.5 hover:bg-white/20 dark:hover:bg-black/20 rounded-md transition-colors"
                          >
                            {copiedId === m.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                      
                      <div className="prose dark:prose-invert prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight px-1">
                      {format(m.timestamp, 'HH:mm')}
                    </span>
                  </div>
                ))
              )}
              {isTyping && (
                <div className="flex items-start gap-2">
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-none px-4 py-3 text-slate-400 flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              {messages.length > 0 && !isLoading && (
                <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-none no-scrollbar">
                  {SUGGESTED_ACTIONS.slice(0, 3).map(action => (
                    <button
                      key={action.id}
                      onClick={() => handleSend(action.label, action.prompt)}
                      className="whitespace-nowrap px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="relative flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Hỏi AI trợ lý..."
                  className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 pr-12 text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "absolute right-1.5 p-2 rounded-lg transition-all",
                    input.trim() && !isLoading 
                      ? "bg-indigo-600 text-white shadow-md hover:bg-indigo-700" 
                      : "text-slate-400 bg-transparent"
                  )}
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>
              <p className="text-[10px] text-center text-slate-400 mt-2">
                AI có thể đưa ra thông tin không chính xác. Hãy kiểm tra kỹ dữ liệu.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

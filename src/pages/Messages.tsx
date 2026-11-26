import React, { useEffect, useState, useRef } from 'react';
import { chatService } from '../features/chat/chatService';
import { useUserStore } from '../store/useUserStore';
import type { Message, Conversation } from '../types/chat';
import { Send, Phone, Video, CheckCheck, MessageCircle, ArrowLeft, MoreHorizontal, Paperclip, Search, X } from 'lucide-react';
import { cn } from '../utils/helpers';
import Button from '../components/ui/Button';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import CallOverlay from '../components/chat/CallOverlay';
import { useNavigate } from 'react-router-dom';

const Messages: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [showCall, setShowCall] = useState(false);
  const [isIncoming, setIsIncoming] = useState(false);
  const [signalQueue, setSignalQueue] = useState<any[]>([]);
  const [incomingOffer, setIncomingOffer] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filteredConversations = conversations.filter(conv => 
    conv.other_user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.last_message?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleStartCall = (type: 'audio' | 'video') => {
    setCallType(type);
    setIsIncoming(false);
    setShowCall(true);
  };

  useEffect(() => {
    if (user?.id) {
      chatService.getConversations(user.id)
        .then(setConversations)
        .catch(() => toast.error("Could not load conversations"));
    }
  }, [user]);

  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (activeConv) {
      scrollToBottom();
      chatService.getMessages(activeConv.id).then(setMessages);
      
      const channel = supabase.channel(`room-${activeConv.id}`);
      channelRef.current = channel;
      
      const sub = channel
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${activeConv.id}`
        }, payload => {
          const msg = payload.new as Message;
          if (msg.sender_id === user?.id) return;
          
          setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          setConversations(prev => prev.map(c => c.id === activeConv.id ? { ...c, last_message: msg.content } : c));
          scrollToBottom();
        })
        .on('broadcast', { event: 'new-message' }, ({ payload }) => {
          const msg = payload as Message;
          if (msg.sender_id === user?.id) return;

          setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          setConversations(prev => prev.map(c => c.id === activeConv.id ? { ...c, last_message: msg.content } : c));
          scrollToBottom();
        })
        .on('broadcast', { event: 'call-signal' }, ({ payload }) => {
          console.log('[Call] Signal Received:', payload.type);
          if (payload.type === 'initiate' && payload.receiver_id === user?.id) {
             setCallType(payload.callType);
             setIsIncoming(true);
             setIncomingOffer(payload.offer);
             setShowCall(true);
             setSignalQueue([]);
          } else if (payload.receiver_id === user?.id) {
             setSignalQueue(prev => [...prev, payload]);
          }
        })
        .subscribe();
      
      return () => {
        supabase.removeChannel(sub);
      };
    }
  }, [activeConv, user?.id]);

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !activeConv || !user) return;
    
    const tempMsg: Message = {
      id: crypto.randomUUID(), // Use real UUID for better matching
      conversation_id: activeConv.id,
      sender_id: user.id,
      receiver_id: activeConv.other_user?.id || '',
      content: newMessage,
      is_read: false,
      created_at: new Date().toISOString(),
      isPending: true
    };

    // 1. Instant local update
    setMessages(prev => [...prev, tempMsg]);
    setNewMessage('');
    scrollToBottom();

    // 2. Ultra-fast broadcast (WebSocket)
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'new-message',
        payload: tempMsg
      });
    }

    try {
      // 3. Background persistence
      const result = await chatService.sendMessage({
        id: tempMsg.id, // Pass the same ID to Supabase
        sender_id: user.id,
        receiver_id: activeConv.other_user?.id,
        content: tempMsg.content,
        conversation_id: activeConv.id
      });

      if (result) {
        setMessages(prev => prev.map(m => m.id === tempMsg.id ? { ...result, isPending: false } : m));
        setConversations(prev => prev.map(c => c.id === activeConv.id ? { ...c, last_message: tempMsg.content } : c));
      }
    } catch (err) {
      toast.error("Offline: Message queued");
      setConversations(prev => prev.map(c => c.id === activeConv.id ? { ...c, last_message: tempMsg.content } : c));
    }
  };

  const selectConversation = (conv: Conversation) => {
    setActiveConv(conv);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen pb-0 md:pb-0 overflow-hidden bg-background relative">
      {/* Call Overlay Integration */}
      {activeConv && activeConv.other_user && (
        <CallOverlay 
          isOpen={showCall}
          onClose={() => { 
            setShowCall(false); 
            setIsIncoming(false); 
            setIncomingOffer(null);
            setSignalQueue([]);
          }}
          type={callType}
          user={activeConv.other_user}
          isIncoming={isIncoming}
          conversationId={activeConv.id}
          signalQueue={signalQueue}
          incomingOffer={incomingOffer}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "bg-surface-container-low md:border-r border-white/5 flex-col transition-all duration-300 z-30 h-full",
        isMobile 
          ? (sidebarOpen ? "flex w-full absolute inset-0 pt-0" : "hidden") 
          : "flex w-96"
      )}>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-6 pb-4 shrink-0 border-b border-white/5 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => navigate(-1)}
                  className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft size={18} className="text-on-surface" />
                </button>
                <h2 className="text-2xl font-bold tracking-tight">Messages</h2>
              </div>
              <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors">
                 <MoreHorizontal size={18} className="text-on-surface-variant" />
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-container-high/40 border border-white/5 rounded-xl py-2 pl-9 pr-8 text-xs font-medium placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/30 transition-colors text-on-surface"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-white/10 text-on-surface-variant/60 hover:text-white transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            
            <span className="text-[10px] font-bold uppercase text-primary/80 tracking-[0.15em] block">
              {searchQuery ? 'Search Results' : 'ACTIVE CHATS'}
            </span>
          </div>
          
          {/* Scrollable Chat List */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {filteredConversations.length > 0 ? filteredConversations.map((conv) => {
              const isActive = activeConv?.id === conv.id;
              return (
                <div 
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={cn(
                    "flex items-center gap-3.5 px-6 py-4.5 transition-all cursor-pointer relative border-l-2 group",
                    isActive 
                      ? "bg-white/[0.04] border-primary" 
                      : "border-transparent hover:bg-white/[0.02]"
                  )}
                >
                  <div className="relative shrink-0">
                    <img 
                      src={conv.other_user?.avatar_url} 
                      className="w-12 h-12 rounded-full object-cover border border-white/10" 
                      alt={conv.other_user?.full_name}
                    />
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-surface-container-low" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className={cn(
                        "text-sm font-semibold truncate transition-colors",
                        isActive ? "text-primary" : "text-on-surface group-hover:text-primary"
                      )}>
                        {conv.other_user?.full_name}
                      </span>
                      <span className="text-[9px] font-medium text-on-surface-variant/40">2m</span>
                    </div>
                    <p className={cn(
                      "text-xs truncate font-medium",
                      isActive ? "text-on-surface" : "text-on-surface-variant/70",
                      !conv.last_message && "italic text-primary/60"
                    )}>
                      {conv.last_message || 'Start conversation...'}
                    </p>
                  </div>
                </div>
              );
            }) : (
              <div className="py-16 text-center text-on-surface-variant opacity-40 flex flex-col items-center gap-4">
                <MessageCircle size={32} />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {searchQuery ? 'No results found' : 'No Inbox Activity'}
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Chat Area */}
      {activeConv ? (
        <section className={cn(
           "flex-1 flex flex-col bg-background relative overflow-hidden h-full",
           isMobile && sidebarOpen ? "hidden" : "flex"
        )}>
          {/* Header */}
          <div className="h-16 md:h-24 px-4 md:px-8 flex items-center justify-between border-b border-white/5 backdrop-blur-3xl z-10 shrink-0">
            <div className="flex items-center gap-3 md:gap-4">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 -ml-2 text-primary"
              >
                <ArrowLeft size={24} />
              </button>
              <div className="relative">
                <img src={activeConv.other_user?.avatar_url} className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border border-white/10" />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm md:text-lg font-black tracking-tight text-white">{activeConv.other_user?.full_name}</span>
                <span className="text-[8px] md:text-[9px] uppercase font-black text-green-500 tracking-widest">Active Now</span>
              </div>
            </div>
            <div className="flex gap-2 md:gap-4 text-on-surface-variant">
              <Phone 
                size={18} 
                className="md:size-5 hover:text-primary cursor-pointer transition-all active:scale-90" 
                onClick={() => handleStartCall('audio')}
              />
              <Video 
                size={18} 
                className="md:size-5 hover:text-primary cursor-pointer transition-all active:scale-90" 
                onClick={() => handleStartCall('video')}
              />
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-6 md:space-y-8 flex flex-col no-scrollbar scroll-smooth">
            {messages.map((msg, idx) => {
               const isMe = msg.sender_id === user?.id;
               const isPending = (msg as any).isPending;
               return (
                  <div 
                    key={msg.id || idx} 
                    className={cn(
                      "max-w-[85%] md:max-w-[75%] flex flex-col gap-1.5",
                      isMe ? "self-end items-end" : "self-start items-start"
                    )}
                  >
                    <div className={cn(
                      "px-4 md:px-6 py-3 md:py-4 rounded-[1.2rem] md:rounded-[2rem] text-sm font-medium leading-relaxed shadow-lg border transition-all",
                      isMe 
                        ? (isPending ? "bg-primary/50 text-white/50 border-white/10" : "bg-primary text-white rounded-br-none border-primary/20") 
                        : "bg-surface-container-high text-on-surface rounded-bl-none border-white/5"
                    )}>
                      {msg.content}
                    </div>
                    <div className="flex items-center gap-2 text-[8px] font-black text-on-surface-variant uppercase tracking-widest opacity-40 px-2 leading-none">
                      {isPending ? 'Pending' : new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {isMe && !isPending && <CheckCheck size={10} className="text-primary" />}
                    </div>
                  </div>
               );
            })}
            <div ref={messagesEndRef} className="pb-4" />
          </div>

          {/* Input Area */}
          <div className="p-4 md:p-8 bg-background shrink-0 safe-area-bottom">
            <div className="max-w-4xl mx-auto">
              <div className="bg-surface-container-high/60 backdrop-blur-xl border border-white/10 rounded-[1.5rem] md:rounded-full p-1.5 md:p-2 flex items-center gap-1 md:gap-2 group focus-within:border-primary/40 transition-all shadow-2xl">
                <button className="hidden md:flex w-12 h-12 rounded-full items-center justify-center text-on-surface-variant hover:text-white hover:bg-white/5 transition-colors">
                  <Paperclip size={20} />
                </button>
                <input 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Message..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface text-sm font-medium placeholder:text-on-surface-variant/40 outline-none px-4 py-2"
                />
                <Button 
                   onClick={handleSend} 
                   className={cn(
                       "w-10 h-10 md:w-12 md:h-12 rounded-full p-0 flex items-center justify-center transition-all shadow-lg",
                       newMessage.trim() ? "bg-primary scale-100" : "bg-white/5 opacity-50 scale-90"
                   )}
                >
                  <Send size={18} className={cn(newMessage.trim() ? "translate-x-0.5 -translate-y-0.5" : "")} />
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className={cn(
          "flex-1 flex flex-col items-center justify-center p-8 bg-background text-center space-y-8 animate-in fade-in duration-500",
          isMobile && "hidden"
        )}>
          <div className="w-24 h-24 rounded-[2.5rem] bg-surface-container-low flex items-center justify-center text-primary shadow-2xl skew-y-3 rotate-3">
             <MessageCircle size={48} className="-rotate-12" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black tracking-tighter">Your Creative Suite</h3>
            <p className="text-on-surface-variant font-bold uppercase tracking-[0.2em] text-[10px] opacity-40">Choose a talent to start the sync</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;

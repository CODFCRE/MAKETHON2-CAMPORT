import React, { useState, useEffect, useRef } from 'react';
import { Phone, Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/helpers';
import { supabase } from '../../lib/supabaseClient';
import { useUserStore } from '../../store/useUserStore';

interface CallOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'audio' | 'video';
  user: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  isIncoming: boolean;
  conversationId: string;
  signalQueue?: any[];
  incomingOffer?: any;
}

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const CallOverlay: React.FC<CallOverlayProps> = ({ 
  isOpen, 
  onClose, 
  type, 
  user: remoteUser, 
  isIncoming, 
  conversationId, 
  signalQueue,
  incomingOffer
}) => {
  const { user: currentUser } = useUserStore();
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'ringing' | 'active' | 'ended'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(type === 'audio');
  const [duration, setDuration] = useState(0);
  
  const pc = useRef<RTCPeerConnection | null>(null);
  const queuedCandidates = useRef<any[]>([]);
  const lastProcessedIndex = useRef(0);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Reset process index when overlay opens
  useEffect(() => {
    if (isOpen) {
      lastProcessedIndex.current = 0;
    }
  }, [isOpen]);

  // Signaling helper
  const sendSignal = (payload: any) => {
    supabase.channel(`room-${conversationId}`).send({
      type: 'broadcast',
      event: 'call-signal',
      payload: { ...payload, sender_id: currentUser?.id, receiver_id: remoteUser.id }
    });
  };

  const setupMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: true
      });
      localStream.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      console.error('Failed to get media:', err);
    }
  };

  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const initPeerConnection = (stream: MediaStream) => {
    const peer = new RTCPeerConnection(configuration);
    
    stream.getTracks().forEach(track => peer.addTrack(track, stream));

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({ 
          type: 'candidate', 
          candidate: {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            usernameFragment: event.candidate.usernameFragment
          }
        });
      }
    };

    peer.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection State:', peer.connectionState);
      if (peer.connectionState === 'connected') {
        setCallStatus('active');
      } else if (peer.connectionState === 'failed' || peer.connectionState === 'closed') {
        handleEndCall();
      }
    };

    peer.ontrack = (event) => {
      console.log('[WebRTC] Remote track received');
      remoteStream.current = event.streams[0];
      
      if (type === 'video' && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      } else if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    pc.current = peer;
    return peer;
  };

  // Start Call (as Caller)
  const startCall = async () => {
    setCallStatus('connecting');
    const stream = await setupMedia();
    if (!stream) return;

    const peer = initPeerConnection(stream);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    sendSignal({ 
      type: 'initiate', 
      callType: type, 
      offer: {
        type: offer.type,
        sdp: offer.sdp
      } 
    });
  };

  // Accept Call (as Receiver)
  const acceptCall = async (offer: any) => {
    setCallStatus('connecting');
    const stream = await setupMedia();
    if (!stream) return;

    const peer = initPeerConnection(stream);
    await peer.setRemoteDescription(new RTCSessionDescription(offer));
    
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    sendSignal({ 
      type: 'answer', 
      answer: {
        type: answer.type,
        sdp: answer.sdp
      } 
    });

    // Process any queued candidates received before remote description was set
    while (queuedCandidates.current.length > 0) {
      const cand = queuedCandidates.current.shift();
      try {
        await peer.addIceCandidate(new RTCIceCandidate(cand));
      } catch (err) {
        console.error('Failed to add queued candidate:', err);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (isIncoming) {
        setCallStatus('ringing');
      } else {
        startCall();
      }
    } else {
      cleanup();
    }
  }, [isOpen]);

  // Handle incoming signals sequentially
  useEffect(() => {
    if (!signalQueue) return;

    const processQueue = async () => {
      while (lastProcessedIndex.current < signalQueue.length) {
        const signal = signalQueue[lastProcessedIndex.current];
        lastProcessedIndex.current++;

        const { type, answer, candidate } = signal;
        
        if (type === 'answer') {
          if (pc.current) {
            await pc.current.setRemoteDescription(new RTCSessionDescription(answer));
            
            // Process any queued candidates received before answer description was set
            while (queuedCandidates.current.length > 0) {
              const cand = queuedCandidates.current.shift();
              try {
                await pc.current.addIceCandidate(new RTCIceCandidate(cand));
              } catch (err) {
                console.error('Failed to add queued candidate:', err);
              }
            }
          }
        } else if (type === 'candidate') {
          if (pc.current && pc.current.remoteDescription) {
            try {
              await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.error('Failed to add candidate:', err);
            }
          } else {
            queuedCandidates.current.push(candidate);
          }
        } else if (type === 'end') {
          setCallStatus('ended');
          setTimeout(onClose, 1000);
        }
      }
    };
    
    processQueue();
  }, [signalQueue, onClose]);

  useEffect(() => {
    let interval: any;
    if (callStatus === 'active') {
      interval = setInterval(() => setDuration(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  const cleanup = () => {
    localStream.current?.getTracks().forEach(t => t.stop());
    pc.current?.close();
    pc.current = null;
    queuedCandidates.current = [];
    setDuration(0);
    setCallStatus('idle');
  };

  const handleEndCall = () => {
    sendSignal({ type: 'end' });
    setCallStatus('ended');
    setTimeout(onClose, 1000);
  };

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="media-stage fixed inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-between py-20 px-6 overflow-hidden"
        >
          {/* Background Video/Image (Blurred) */}
          <div className="absolute inset-0 -z-10 opacity-20 blur-2xl">
            <img src={remoteUser.avatar_url} className="w-full h-full object-cover scale-150" alt="" />
          </div>

          {/* Header */}
          <div className="text-center space-y-6 relative z-10 w-full max-w-lg">
            <div className="relative inline-block">
               <motion.div 
                 animate={callStatus === 'connecting' || callStatus === 'ringing' ? { scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] } : {}}
                 transition={{ repeat: Infinity, duration: 2 }}
                 className="absolute inset-0 rounded-full bg-primary/30 -m-6"
               />
               <img src={remoteUser.avatar_url} className="w-24 h-24 md:w-40 md:h-40 rounded-full border-4 border-white/10 shadow-2xl relative z-10 object-cover" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-white">{remoteUser.full_name}</h2>
              <p className={cn(
                "text-[10px] md:text-xs font-black uppercase tracking-[0.4em] mt-2",
                (callStatus === 'connecting' || callStatus === 'ringing') ? "text-primary animate-pulse" : "text-on-surface-variant opacity-60"
              )}>
                {callStatus === 'ringing' ? 'Incoming Call...' : 
                 callStatus === 'connecting' ? 'Establishing WebRTC...' : 
                 callStatus === 'active' ? formatDuration(duration) : 'Call Ended'}
              </p>
            </div>
          </div>

          {/* Hidden audio for voice-only calls */}
          <audio ref={remoteAudioRef} autoPlay />

          {/* Video Feeds */}
          {type === 'video' && callStatus === 'active' && (
            <div className="absolute inset-0 z-0 flex items-center justify-center">
               <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
               />
               {/* Local Self-Preview */}
               <motion.div 
                 drag
                 dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
                 className="absolute top-10 right-10 w-32 h-44 md:w-48 md:h-64 rounded-3xl border-2 border-white/20 overflow-hidden bg-zinc-900 shadow-2xl z-50 cursor-move"
               >
                  <video 
                    ref={localVideoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover"
                  />
               </motion.div>
            </div>
          )}

          {/* Incoming Call Actions */}
          {callStatus === 'ringing' && isIncoming && (
            <div className="flex gap-10 relative z-50">
               <button 
                 onClick={() => acceptCall(incomingOffer)}
                 className="w-20 h-20 rounded-full bg-success text-white flex items-center justify-center shadow-2xl shadow-success/30 active:scale-95 transition-all animate-bounce"
               >
                 <Phone size={32} />
               </button>
               <button 
                 onClick={handleEndCall}
                 className="w-20 h-20 rounded-full bg-error text-white flex items-center justify-center shadow-2xl shadow-error/30 active:scale-95 transition-all"
               >
                 <PhoneOff size={32} />
               </button>
            </div>
          )}

          {/* Active Call Controls */}
          {(callStatus === 'active' || (callStatus === 'connecting' && !isIncoming)) && (
            <div className="flex items-center gap-6 md:gap-10 relative z-20">
              <ControlButton 
                onClick={() => {
                  const audioTrack = localStream.current?.getAudioTracks()[0];
                  if (audioTrack) audioTrack.enabled = !audioTrack.enabled;
                  setIsMuted(!isMuted);
                }} 
                icon={isMuted ? MicOff : Mic} 
                active={isMuted}
              />
              {type === 'video' && (
                <ControlButton 
                  onClick={() => {
                    const videoTrack = localStream.current?.getVideoTracks()[0];
                    if (videoTrack) videoTrack.enabled = !videoTrack.enabled;
                    setIsVideoOff(!isVideoOff);
                  }} 
                  icon={isVideoOff ? VideoOff : VideoIcon} 
                  active={isVideoOff}
                />
              )}
              <button 
                onClick={handleEndCall}
                className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-error flex items-center justify-center text-white shadow-2xl shadow-error/40 active:scale-90 transition-all hover:bg-error/80"
              >
                <PhoneOff size={32} />
              </button>
              <ControlButton icon={Maximize2} />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ControlButton: React.FC<{ onClick?: () => void; icon: any; active?: boolean }> = ({ onClick, icon: Icon, active }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all active:scale-90",
      active ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20 border border-white/5"
    )}
  >
    <Icon size={24} />
  </button>
);

export default CallOverlay;

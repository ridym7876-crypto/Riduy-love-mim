import { Mic, Phone, PhoneOff, Loader2, Settings, MonitorUp, MonitorOff, ExternalLink, History, X } from 'lucide-react';
import { useLiveAudio } from '../hooks/useLiveAudio';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useState } from 'react';

export default function Home() {
  const { isConnected, isConnecting, error, showOwner, isScreenSharing, websiteResult, userVolume, aiVolume, chatHistory, connect, disconnect, startScreenShare, stopScreenShare } = useLiveAudio();
  const navigate = useNavigate();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/');
  };

  const isAdmin = auth.currentUser?.email === 'ridym7876@gmail.com';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 overflow-hidden flex flex-col gap-6 relative">
      
      {/* Header */}
      <header className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-800 max-w-6xl w-full mx-auto relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            <Mic size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Bangla Help Bot</h1>
            <p className="text-xs text-slate-400 uppercase tracking-widest">Powered by Gemini Live API</p>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <button onClick={() => setIsHistoryOpen(true)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-full border border-slate-700 text-sm transition-colors">
            <History className="w-4 h-4" /> History
          </button>
          
          {isAdmin && (
            <button onClick={() => navigate('/admin')} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-full border border-slate-700 text-sm transition-colors">
              <Settings className="w-4 h-4" /> Control Panel
            </button>
          )}
          
          <button onClick={handleSignOut} className="text-sm text-slate-400 hover:text-white transition-colors">
            Logout
          </button>

          {isConnected ? (
            <div className="flex items-center gap-2 bg-green-500/10 text-green-400 px-3 py-1 rounded-full border border-green-500/20 text-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Connected
            </div>
          ) : isConnecting ? (
            <div className="flex items-center gap-2 bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full border border-amber-500/20 text-sm">
              <Loader2 className="w-3 h-3 animate-spin" /> Connecting...
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700 text-sm">
              Ready
            </div>
          )}
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-6xl mx-auto w-full grid grid-cols-12 grid-rows-6 gap-4 relative z-10">
        
        {/* Main Voice Hub Cell */}
        <div className="col-span-12 md:col-span-7 row-span-4 bg-slate-900 rounded-3xl border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          
          <div className="z-10 text-center mb-12">
            {showOwner ? (
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                <div className="w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.6)] mb-4 bg-slate-800 flex items-center justify-center">
                   <img src="/owner.jpg" alt="Abdul Khalek Hridoy" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541'; }} />
                </div>
                <h2 className="text-2xl font-semibold text-white">আব্দুল খালেক রিদয়</h2>
                <p className="text-blue-400 font-mono mt-1">AI Creator & Owner</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                {isConnected ? (
                  <div className="flex gap-12 mb-8 items-end h-32">
                    {/* User Volume Sphere */}
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative flex items-center justify-center w-20 h-20">
                         <div 
                           className="absolute rounded-full bg-emerald-500/30 transition-all duration-75"
                           style={{ width: `${80 + userVolume * 1.5}px`, height: `${80 + userVolume * 1.5}px`, opacity: Math.min(1, userVolume / 50 + 0.2) }}
                         />
                         <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)] z-10">
                            <Mic size={24} />
                         </div>
                      </div>
                      <span className="text-emerald-400 font-mono text-sm">You</span>
                    </div>

                    {/* AI Volume Sphere */}
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative flex items-center justify-center w-20 h-20">
                         <div 
                           className="absolute rounded-full bg-blue-500/30 transition-all duration-75"
                           style={{ width: `${80 + aiVolume * 1.5}px`, height: `${80 + aiVolume * 1.5}px`, opacity: Math.min(1, aiVolume / 50 + 0.2) }}
                         />
                         <div className="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.5)] z-10">
                            <span className="font-serif italic text-2xl font-bold">B</span>
                         </div>
                      </div>
                      <span className="text-blue-400 font-mono text-sm">Bangla Bot</span>
                    </div>
                  </div>
                ) : (
                  <div className="relative flex items-center justify-center mb-8 mx-auto w-24 h-24 bg-blue-500/20 rounded-full border border-blue-500/30">
                     <div className="w-16 h-16 rounded-full flex items-center justify-center bg-slate-800 text-slate-400 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                        <Mic size={32} />
                     </div>
                  </div>
                )}
                
                <h2 className="text-2xl font-semibold">{isConnected ? 'Session Active' : 'Idle'}</h2>
                <p className="text-blue-400 font-mono mt-1">
                   {isConnecting ? 'Establishing connection...' : isConnected ? 'Conversation in progress...' : 'Click to start'}
                </p>
              </div>
            )}
          </div>

          <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 z-10">
            <button
              onClick={isConnected ? disconnect : connect}
              disabled={isConnecting}
              aria-label={isConnected ? "End call" : "Start call"}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                isConnected 
                  ? 'bg-red-500/10 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white' 
                  : 'bg-blue-600 border border-blue-500/50 text-white hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]'
              } ${isConnecting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
            >
              {isConnected ? <PhoneOff size={24} /> : <Phone size={24} className="fill-current" />}
            </button>
            
            {isConnected && (
              <button
                onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                aria-label={isScreenSharing ? "Stop Screen Share" : "Start Screen Share"}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                  isScreenSharing 
                    ? 'bg-emerald-500/10 border border-emerald-500/50 text-emerald-500 hover:bg-emerald-500 hover:text-white' 
                    : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                } hover:scale-105 active:scale-95`}
              >
                {isScreenSharing ? <MonitorOff size={24} /> : <MonitorUp size={24} />}
              </button>
            )}
          </div>
        </div>

        {/* Status & Error Logs Cell */}
        <div className={`col-span-12 md:col-span-5 ${websiteResult ? 'row-span-2' : 'row-span-3'} bg-slate-900 rounded-3xl border border-slate-800 p-5 flex flex-col`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">System Logs</h3>
            <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
          </div>
          
          <div className="flex-1 bg-slate-950/50 rounded-xl border border-slate-800 p-4 font-mono text-xs overflow-y-auto">
            {error ? (
              <div className="text-red-400 whitespace-pre-wrap">{error}</div>
            ) : (
              <div className="text-slate-500 flex flex-col gap-2">
                <p>[SYSTEM] Ready for audio initialization.</p>
                {isConnecting && <p className="text-blue-400">[SYSTEM] Connecting to server-side Live API bridge...</p>}
                {isConnected && <p className="text-emerald-400">[SYSTEM] Connection established. Capturing microphone input.</p>}
                {isScreenSharing && <p className="text-emerald-400">[SYSTEM] Screen sharing active. Sending visual context.</p>}
                {showOwner && <p className="text-blue-400">[SYSTEM] Identity triggered: Displaying AI creator card.</p>}
              </div>
            )}
          </div>
        </div>

        {/* Website Result Cell */}
        {websiteResult && (
          <div className="col-span-12 md:col-span-5 row-span-1 bg-slate-800/80 rounded-3xl border border-blue-500/30 p-5 flex flex-col justify-center shadow-[0_0_20px_rgba(37,99,235,0.1)]">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
               <ExternalLink size={16} />
               <h3 className="text-xs font-semibold uppercase tracking-wider">Suggested Link</h3>
            </div>
            <a href={websiteResult.url} target="_blank" rel="noopener noreferrer" className="text-lg font-medium text-white hover:text-blue-300 hover:underline truncate">
              {websiteResult.name}
            </a>
            <p className="text-sm text-slate-400 line-clamp-2 mt-1">{websiteResult.description}</p>
          </div>
        )}

        {/* Info Cell */}
        <div className="col-span-12 md:col-span-5 row-span-1 bg-gradient-to-br from-blue-900/40 to-slate-900 rounded-3xl border border-blue-900/50 p-5 flex items-center gap-4">
           <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
             <span className="text-blue-400 text-lg font-serif italic">B</span>
           </div>
           <div>
             <h4 className="font-medium text-slate-200">Bangla Assistant</h4>
             <p className="text-xs text-slate-400 mt-0.5">Supports real-time bilingual conversations in Bengali and English.</p>
           </div>
        </div>
      </main>
      
      {/* Decorative blurs */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* History Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div className="flex items-center gap-2 text-white">
                <History className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold">Call History</h2>
              </div>
              <button 
                onClick={() => setIsHistoryOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {chatHistory.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 h-full py-12">
                   <History className="w-12 h-12 mb-3 opacity-20" />
                   <p>No conversation history yet.</p>
                   <p className="text-sm mt-1">Start a call and speak to see transcripts here.</p>
                </div>
              ) : (
                chatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.sender === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-sm' 
                        : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700'
                    }`}>
                      <div className="text-xs opacity-50 mb-1 flex items-center gap-1">
                         {msg.sender === 'user' ? 'You' : 'Bangla Bot'}
                         <span className="text-[10px]">• {msg.timestamp.toLocaleTimeString()}</span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

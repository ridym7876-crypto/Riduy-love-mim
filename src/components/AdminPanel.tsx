import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ArrowLeft, Save, Loader2, ShieldCheck } from 'lucide-react';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Basic guard
    if (auth.currentUser?.email !== 'ridym7876@gmail.com') {
      navigate('/home');
      return;
    }

    const fetchInstruction = async () => {
      try {
        const docRef = doc(db, 'ai_settings', 'instruction');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setInstruction(docSnap.data().text);
        }
      } catch (err) {
        console.error("Failed to fetch instruction", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInstruction();
  }, [navigate]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const docRef = doc(db, 'ai_settings', 'instruction');
      await setDoc(docRef, { text: instruction });
      setMessage('Instructions saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      console.error(err);
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <header className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/home')}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)]">
                 <ShieldCheck size={24} className="text-white" />
               </div>
               <div>
                 <h1 className="text-xl font-bold tracking-tight">Admin Control Panel</h1>
                 <p className="text-xs text-slate-400">Teach AI its behavior</p>
               </div>
            </div>
          </div>
        </header>

        <main className="bg-slate-900 rounded-3xl border border-slate-800 p-6 md:p-8 flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">System Instructions</h2>
            <p className="text-sm text-slate-400">
              Provide the prompt that will dictate the AI's behavior, knowledge, and rules. 
              The AI will follow these orders when a user connects.
            </p>
          </div>

          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="You are a helpful assistant..."
            className="w-full h-64 bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors resize-y"
          />

          <div className="flex items-center justify-between">
            <div className="text-sm">
              {message && (
                <span className={message.startsWith('Error') ? 'text-red-400' : 'text-green-400'}>
                  {message}
                </span>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-medium transition-all hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save Instructions
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

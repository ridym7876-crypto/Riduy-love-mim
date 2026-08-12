import { useNavigate } from 'react-router-dom';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { LogIn } from 'lucide-react';
import { useState } from 'react';

export default function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/home');
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full shadow-2xl relative z-10 flex flex-col items-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.4)] mb-6">
          <LogIn size={32} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
        <p className="text-slate-400 text-center mb-8">Sign in to continue to Bangla Help Bot</p>

        {error && (
          <div className="w-full bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 hover:bg-slate-100 font-semibold py-3 px-6 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

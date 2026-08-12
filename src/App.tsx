import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { Loader2 } from 'lucide-react';

import Login from './components/Login';
import Home from './components/Home';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [user, setUser] = useState<any>(undefined); // undefined means loading

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
         <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/home" /> : <Login />} />
        <Route path="/home" element={user ? <Home /> : <Navigate to="/" />} />
        <Route path="/admin" element={user?.email === 'ridym7876@gmail.com' ? <AdminPanel /> : <Navigate to="/home" />} />
      </Routes>
    </BrowserRouter>
  );
}

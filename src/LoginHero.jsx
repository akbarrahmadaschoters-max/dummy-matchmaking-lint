import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from './firebase.js';

export default function LoginHero() {
  const [errorMsg, setErrorMsg] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setErrorMsg(null);
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // Jika berhasil, onAuthStateChanged di App.jsx akan menangkap perubahannya
      // dan secara otomatis me-render dashboard.
    } catch (error) {
      console.error("Login failed", error);
      setIsLoggingIn(false);
      
      if (error.code === 'auth/configuration-not-found' || error.message.includes('CONFIGURATION_NOT_FOUND')) {
        setErrorMsg("Konfigurasi Firebase tidak ditemukan. Pastikan Anda telah memasukkan config Firebase di src/firebase.js dan mengaktifkan metode Sign-in Google di console.");
      } else if (error.message.includes('api-key-not-valid') || error.message.includes('API_KEY_INVALID')) {
        setErrorMsg("API Key tidak valid. Sepertinya Anda masih menggunakan placeholder 'GANTI_DENGAN_API_KEY'. Silakan masukkan config asli dari Firebase Console Anda ke dalam file src/firebase.js.");
      } else {
        setErrorMsg("Login gagal, silakan coba lagi. (" + error.message + ")");
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      background: 'radial-gradient(circle at center, #1E1B4B 0%, #0F172A 70%, #111827 100%)',
      overflow: 'hidden',
      fontFamily: "'Inter', system-ui, sans-serif"
    }}>
      {/* Background Glowing Blobs */}
      <div style={{
        position: 'absolute', top: '10%', left: '20%', width: '40vw', height: '40vw',
        background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(0,0,0,0) 70%)',
        borderRadius: '50%', filter: 'blur(60px)', animation: 'float 10s ease-in-out infinite alternate', zIndex: 0
      }}></div>
      <div style={{
        position: 'absolute', bottom: '10%', right: '20%', width: '35vw', height: '35vw',
        background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(0,0,0,0) 70%)',
        borderRadius: '50%', filter: 'blur(70px)', animation: 'float 12s ease-in-out infinite alternate-reverse', zIndex: 0
      }}></div>

      <style>
        {`
          @keyframes float {
            0% { transform: translate(0px, 0px) scale(1); }
            100% { transform: translate(40px, -40px) scale(1.1); }
          }
          @keyframes fadeUp {
            0% { opacity: 0; transform: translateY(30px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes glowPulse {
            0% { box-shadow: 0 0 15px rgba(59,130,246,0.4); }
            100% { box-shadow: 0 0 30px rgba(59,130,246,0.8); }
          }
          .hero-content {
            animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          
          /* Abstract Glass Shapes */
          .glass-circle {
            position: absolute;
            top: 25%; left: 15%;
            width: 120px; height: 120px;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01));
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 8px 32px rgba(59,130,246,0.15), inset 0 0 20px rgba(99,102,241,0.2);
            animation: float 14s ease-in-out infinite alternate;
            z-index: 1;
          }
          
          .glass-diamond {
            position: absolute;
            bottom: 30%; right: 15%;
            width: 100px; height: 100px;
            background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01));
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
            transform: rotate(45deg);
            box-shadow: 0 8px 32px rgba(99,102,241,0.15), inset 0 0 20px rgba(59,130,246,0.2);
            animation: float 16s ease-in-out infinite alternate-reverse;
            z-index: 1;
          }
        `}
      </style>

      {/* Decorative 3D Glass Shapes */}
      <div className="glass-circle"></div>
      <div className="glass-diamond"></div>

      {/* Main Content */}
      <div className="hero-content" style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 10, padding: '20px', textAlign: 'center'
      }}>
        {/* Logo */}
        <div style={{
          width: 72, height: 72, background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
          borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 32, boxShadow: '0 0 25px rgba(59,130,246,0.5), inset 0 2px 4px rgba(255,255,255,0.3)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <span style={{ color: '#FFF', fontSize: 36, fontWeight: 800 }}>L</span>
        </div>

        {/* Title */}
        <h1 style={{
          margin: '0 0 16px 0', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800, color: '#FFFFFF',
          letterSpacing: '-0.02em', lineHeight: 1.1, maxWidth: 800
        }}>
          Revamp Matchmaking <span style={{ background: 'linear-gradient(to right, #60A5FA, #3B82F6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 0 20px rgba(59,130,246,0.3)' }}>LINT</span> Apps
        </h1>

        {/* Subtitle */}
        <p style={{ margin: '0 0 48px 0', fontSize: 'clamp(16px, 2vw, 20px)', color: '#94A3B8', fontWeight: 500 }}>
          Developed by Akbar
        </p>

        {/* Error Message */}
        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#FCA5A5', padding: '12px 20px', borderRadius: '12px',
            marginBottom: '24px', maxWidth: '500px', fontSize: '14px', lineHeight: 1.5,
            backdropFilter: 'blur(8px)'
          }}>
            {errorMsg}
          </div>
        )}

        {/* CTA Button */}
        <button onClick={handleLogin} disabled={isLoggingIn} style={{
          background: 'linear-gradient(to right, #3B82F6, #6366F1)', color: '#FFFFFF',
          border: '1px solid rgba(255,255,255,0.1)', padding: '16px 40px', borderRadius: 12, fontSize: 16, fontWeight: 700,
          cursor: isLoggingIn ? 'not-allowed' : 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 0 15px rgba(59,130,246,0.5)',
          display: 'flex', alignItems: 'center', gap: 12, opacity: isLoggingIn ? 0.8 : 1
        }}
        onMouseEnter={e => {
          if(!isLoggingIn) {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 0 30px rgba(59,130,246,0.8), inset 0 2px 4px rgba(255,255,255,0.2)';
          }
        }}
        onMouseLeave={e => {
          if(!isLoggingIn) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 0 15px rgba(59,130,246,0.5)';
          }
        }}
        >
          {/* Google G Icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {isLoggingIn ? 'Memproses...' : 'Masuk dengan Google'}
        </button>

        {/* Small contact text */}
        <p style={{ margin: '32px 0 0 0', fontSize: 13, color: '#94A3B8', fontWeight: 500 }}>
          If any case, please contact Akbar
        </p>
      </div>

      {/* Footer */}
      <div style={{
        padding: '24px', textAlign: 'center', position: 'relative', zIndex: 10,
        fontSize: 12, color: '#64748B', fontWeight: 500
      }}>
        © 2026 LINT · Tim Ops
      </div>
    </div>
  );
}

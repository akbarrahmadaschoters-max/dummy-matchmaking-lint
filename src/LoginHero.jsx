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
    } catch (error) {
      console.error("Login failed", error);
      setIsLoggingIn(false);
      
      if (error.code === 'auth/configuration-not-found' || error.message.includes('CONFIGURATION_NOT_FOUND')) {
        setErrorMsg("Konfigurasi Firebase tidak ditemukan. Pastikan Anda telah memasukkan config Firebase di src/firebase.js.");
      } else if (error.message.includes('api-key-not-valid') || error.message.includes('API_KEY_INVALID')) {
        setErrorMsg("API Key tidak valid. Silakan masukkan config asli dari Firebase Console.");
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
      background: '#F8FAFC',
      color: '#0F172A',
      fontFamily: "'Inter', system-ui, sans-serif",
      position: 'relative',
      overflowX: 'hidden'
    }}>
      <style>
        {`
          @keyframes floatOverlay {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
          }
          @keyframes floatOverlayReverse {
            0% { transform: translateY(0px); }
            50% { transform: translateY(10px); }
            100% { transform: translateY(0px); }
          }
          @keyframes glowPulse {
            0% { box-shadow: 0 0 10px rgba(99,102,241,0.2); }
            100% { box-shadow: 0 0 25px rgba(99,102,241,0.6); }
          }
          @keyframes waveGrow {
            0%, 100% { height: 4px; }
            50% { height: 18px; }
          }
          .floating-widget-1 {
            animation: floatOverlay 6s ease-in-out infinite;
          }
          .floating-widget-2 {
            animation: floatOverlayReverse 7s ease-in-out infinite;
          }
          .pulse-button {
            animation: glowPulse 2s infinite alternate;
          }
          .wave-bar {
            width: 2px;
            background: #6366F1;
            border-radius: 2px;
            display: inline-block;
          }
        `}
      </style>

      {/* Navbar Header (Simplified) */}
      <header style={{
        height: 70,
        display: 'flex',
        alignItems: 'center',
        padding: '0 40px',
        borderBottom: '1px solid #E2E8F0',
        background: '#FFFFFF',
        zIndex: 50
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, #6366F1, #818CF8)',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ color: '#FFF', fontSize: 16, fontWeight: 800 }}>L</span>
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>LINT</span>
        </div>
      </header>

      {/* Main Hero Container */}
      <main style={{
        flex: 1,
        maxWidth: 1200,
        margin: '0 auto',
        padding: '80px 40px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 60,
        alignItems: 'center',
        zIndex: 10
      }}>
        {/* Left Side: Copywriting */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          
          {/* Heading */}
          <h1 style={{
            fontSize: 'clamp(36px, 4.5vw, 54px)',
            fontWeight: 800,
            color: '#0F172A',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            margin: '0 0 16px 0'
          }}>
            LINT Teacher<br />
            Monitoring APPS
          </h1>

          {/* Subtext */}
          <p style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#6366F1',
            margin: '0 0 36px 0'
          }}>
            Developed by Akbar Rahmada
          </p>

          {/* Auth Error Message */}
          {errorMsg && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA',
              color: '#B91C1C', padding: '12px 18px', borderRadius: '12px',
              marginBottom: '24px', maxWidth: '480px', fontSize: '13px', lineHeight: 1.5
            }}>
              {errorMsg}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 14, width: '100%' }}>
            <button onClick={handleLogin} disabled={isLoggingIn} className="pulse-button" style={{
              background: '#6366F1', color: '#FFF', border: 'none', borderRadius: 12,
              padding: '16px 36px', fontSize: 15, fontWeight: 700, cursor: isLoggingIn ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              {/* Google G Icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#FFF"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#FFF"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FFF"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#FFF"/>
              </svg>
              {isLoggingIn ? 'Memproses...' : 'Masuk dengan Google'}
            </button>
          </div>

        </div>

        {/* Right Side: Visual Mockup (Matching reference design) */}
        <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
          
          {/* Main Container Wrapper */}
          <div style={{
            width: '100%',
            maxWidth: 420,
            aspectRatio: '0.85/1',
            background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
            borderRadius: 24,
            padding: 20,
            position: 'relative',
            boxShadow: '0 20px 40px rgba(99,102,241,0.1)',
            boxSizing: 'border-box'
          }}>
            {/* Main Video Frame */}
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: 20,
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              background: '#FFFFFF'
            }}>
              <img src="/friendly_tutor_face.png" alt="Friendly Tutor" style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }} />

              {/* Host Tag */}
              <div style={{
                position: 'absolute', top: 12, left: 12,
                background: '#6366F1', color: '#FFF', fontSize: 10, fontWeight: 700,
                padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase'
              }}>
                Host
              </div>

              {/* Top Right Mic Animation Widget */}
              <div className="floating-widget-1" style={{
                position: 'absolute', top: 12, right: 12,
                background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)',
                borderRadius: 12, padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 18, width: 22, justifyContent: 'center' }}>
                  <div className="wave-bar" style={{ animation: 'waveGrow 1.2s infinite ease-in-out' }} />
                  <div className="wave-bar" style={{ animation: 'waveGrow 0.8s infinite ease-in-out 0.2s' }} />
                  <div className="wave-bar" style={{ animation: 'waveGrow 1.5s infinite ease-in-out 0.4s' }} />
                  <div className="wave-bar" style={{ animation: 'waveGrow 1s infinite ease-in-out 0.1s' }} />
                </div>
              </div>

              {/* Timer Badge */}
              <div style={{
                position: 'absolute', top: 56, right: 12,
                background: 'rgba(15,23,42,0.8)', color: '#FFF', fontSize: 10, fontWeight: 700,
                padding: '4px 9px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
                00:58:29
              </div>

              {/* Chat Bubble Message Overlay Widget */}
              <div className="floating-widget-2" style={{
                position: 'absolute', bottom: 70, left: 16, right: 16,
                background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
                border: '1.5px solid rgba(255,255,255,0.6)', borderRadius: 16,
                padding: 12, display: 'flex', flexDirection: 'column', gap: 4,
                boxShadow: '0 10px 25px rgba(0,0,0,0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#FFF', fontWeight: 800 }}>
                    Y
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#0F172A' }}>You</span>
                  <span style={{ fontSize: 9, color: '#94A3B8' }}>2m ago</span>
                </div>
                <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.4 }}>
                  Good question. We'll discuss the timeline today and decide on the first few milestones together.
                </div>
              </div>

              {/* Floating Participant Box */}
              <div className="floating-widget-1" style={{
                position: 'absolute', bottom: 12, right: 12, width: 85, aspectRatio: '1/1',
                borderRadius: 12, overflow: 'hidden', border: '2px solid #FFF',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', background: '#EEF2FF'
              }}>
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #818CF8, #6366F1)' }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#FFF' }}>T</span>
                </div>
              </div>

              {/* Bottom Control Actions Mockup */}
              <div style={{
                position: 'absolute', bottom: 12, left: 12,
                background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
                borderRadius: 10, padding: '6px 10px', display: 'flex', gap: 6,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>📹</div>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>🎙️</div>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>💬</div>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

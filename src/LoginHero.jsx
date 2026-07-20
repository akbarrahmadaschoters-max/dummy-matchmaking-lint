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
      background: '#FFFFFF',
      backgroundImage: `
        radial-gradient(circle at 10% 20%, rgba(139,92,246,0.08) 0%, transparent 45%),
        radial-gradient(circle at 90% 80%, rgba(253,224,71,0.12) 0%, transparent 50%),
        linear-gradient(to right, rgba(139,92,246,0.03) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(139,92,246,0.03) 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 100% 100%, 80px 80px, 80px 80px',
      color: '#0F172A',
      fontFamily: "'Inter', system-ui, sans-serif",
      position: 'relative',
      overflowX: 'hidden'
    }}>
      <style>
        {`
          @keyframes floatOverlay {
            0% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-8px) rotate(1.5deg); }
            100% { transform: translateY(0px) rotate(0deg); }
          }
          @keyframes floatOverlayReverse {
            0% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(8px) rotate(-1.5deg); }
            100% { transform: translateY(0px) rotate(0deg); }
          }
          @keyframes glowPulse {
            0% { box-shadow: 0 0 10px rgba(99,102,241,0.25); }
            100% { box-shadow: 0 0 25px rgba(99,102,241,0.55); }
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
            animation: glowPulse 2.0s infinite alternate;
          }
          .wave-bar {
            width: 2px;
            background: #6366F1;
            border-radius: 2px;
            display: inline-block;
          }
        `}
      </style>

      {/* Navbar Header (Simplified, clean) */}
      <header style={{
        height: 70,
        display: 'flex',
        alignItems: 'center',
        padding: '0 40px',
        background: 'transparent',
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

      {/* Semicircles (Playful yellow & purple shapes from reference) */}
      <div style={{
        position: 'absolute', top: 0, left: '20%', width: 140, height: 45,
        background: 'rgba(253, 224, 71, 0.4)', borderBottomLeftRadius: 70, borderBottomRightRadius: 70, zIndex: 0
      }} />
      <div style={{
        position: 'absolute', bottom: 0, right: '25%', width: 180, height: 60,
        background: 'rgba(167, 139, 250, 0.25)', borderTopLeftRadius: 90, borderTopRightRadius: 90, zIndex: 0
      }} />

      {/* Yellow Arrow Accent - Rotated and placed playfully */}
      <div className="floating-widget-1" style={{
        position: 'absolute', top: '16%', right: '36%', fontSize: 84, fontWeight: 900, color: '#FCD34D',
        transform: 'rotate(-15deg)', opacity: 0.9, textShadow: '0 6px 18px rgba(252,211,77,0.4)', zIndex: 1
      }}>
        ↗
      </div>

      {/* Thick Gradient Checkmark Accent - Placed playfully behind the card */}
      <div className="floating-widget-2" style={{
        position: 'absolute', bottom: '12%', left: '42%', zIndex: 1,
        filter: 'drop-shadow(0 12px 24px rgba(99,102,241,0.15))'
      }}>
        <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="checkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C084FC" />
              <stop offset="100%" stopColor="#F472B6" />
            </linearGradient>
          </defs>
          <path d="M22 52 L42 72 L82 32" stroke="url(#checkGrad)" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Main Hero Container */}
      <main style={{
        flex: 1,
        maxWidth: 1100,
        margin: '0 auto',
        padding: '60px 40px',
        display: 'grid',
        gridTemplateColumns: '1.05fr 0.95fr',
        gap: 50,
        alignItems: 'center',
        zIndex: 10
      }}>
        {/* Left Side: Copywriting */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', zIndex: 10 }}>
          
          {/* Heading - Clean dark navy text for absolute clarity */}
          <h1 style={{
            fontSize: 'clamp(36px, 4.5vw, 50px)',
            fontWeight: 800,
            color: '#1E293B',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            margin: '0 0 20px 0'
          }}>
            LINT Teacher<br />
            Monitoring APPS
          </h1>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 14, width: '100%', marginBottom: 36 }}>
            <button onClick={handleLogin} disabled={isLoggingIn} className="pulse-button" style={{
              background: '#6366F1', color: '#FFFFFF', border: 'none', borderRadius: 12,
              padding: '16px 36px', fontSize: 15, fontWeight: 800, cursor: isLoggingIn ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s',
              boxShadow: '0 8px 25px rgba(99,102,241,0.25)'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              {/* Google G Icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#FFFFFF"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#FFFFFF"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FFFFFF"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#FFFFFF"/>
              </svg>
              {isLoggingIn ? 'Memproses...' : 'Masuk dengan Google'}
            </button>
          </div>

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

          {/* Developer Card (Clean glassmorphic dark grey) */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.05)',
            border: '1.5px solid rgba(15, 23, 42, 0.08)',
            borderRadius: 20,
            padding: '16px 24px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.02)',
            display: 'inline-block'
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#1E293B' }}>by Akbar Rahmada Maulana</div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 4, fontWeight: 600, letterSpacing: '0.05em' }}>LINT Bishops</div>
          </div>

        </div>

        {/* Right Side: Visual Mockup */}
        <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 10 }}>
          
          {/* Main Container Wrapper */}
          <div style={{
            width: '100%',
            maxWidth: 390,
            aspectRatio: '0.85/1',
            background: '#F5F3FF',
            border: '1.5px solid #E9D5FF',
            borderRadius: 24,
            padding: 16,
            position: 'relative',
            boxShadow: '0 20px 45px rgba(139,92,246,0.1)',
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
                background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
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
                background: 'rgba(15,23,42,0.85)', color: '#FFF', fontSize: 10, fontWeight: 700,
                padding: '4px 9px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
                00:58:29
              </div>

              {/* Chat Message Overlay Widget */}
              <div className="floating-widget-2" style={{
                position: 'absolute', bottom: 70, left: 14, right: 14,
                background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(12px)',
                border: '1.5px solid rgba(255,255,255,0.6)', borderRadius: 16,
                padding: 10, display: 'flex', flexDirection: 'column', gap: 4,
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#FFF', fontWeight: 800 }}>
                    Y
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#0F172A' }}>You</span>
                  <span style={{ fontSize: 9, color: '#94A3B8' }}>2m ago</span>
                </div>
                <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.4 }}>
                  Good question. We'll discuss the timeline today and decide on the milestones.
                </div>
              </div>

              {/* Floating Participant Box */}
              <div className="floating-widget-1" style={{
                position: 'absolute', bottom: 12, right: 12, width: 80, aspectRatio: '1/1',
                borderRadius: 12, overflow: 'hidden', border: '2px solid #FFF',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', background: '#EEF2FF'
              }}>
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #818CF8, #6366F1)' }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#FFF' }}>T</span>
                </div>
              </div>

              {/* Bottom Control Actions */}
              <div style={{
                position: 'absolute', bottom: 12, left: 12,
                background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
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

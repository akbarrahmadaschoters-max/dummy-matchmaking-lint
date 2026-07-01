import React from 'react';

export default function LoginHero({ onLogin }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      background: 'linear-gradient(135deg, #EEF2FF 0%, #F8FAFC 100%)',
      overflow: 'hidden',
      fontFamily: "'Inter', system-ui, sans-serif"
    }}>
      {/* Background Blobs */}
      <div style={{
        position: 'absolute', top: '-10%', left: '-5%', width: '40vw', height: '40vw',
        background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(255,255,255,0) 70%)',
        borderRadius: '50%', filter: 'blur(40px)', animation: 'float 12s ease-in-out infinite alternate', zIndex: 0
      }}></div>
      <div style={{
        position: 'absolute', bottom: '-20%', right: '-10%', width: '50vw', height: '50vw',
        background: 'radial-gradient(circle, rgba(129,140,248,0.12) 0%, rgba(255,255,255,0) 70%)',
        borderRadius: '50%', filter: 'blur(50px)', animation: 'float 15s ease-in-out infinite alternate-reverse', zIndex: 0
      }}></div>

      <style>
        {`
          @keyframes float {
            0% { transform: translate(0px, 0px) scale(1); }
            100% { transform: translate(30px, 50px) scale(1.1); }
          }
          @keyframes fadeUp {
            0% { opacity: 0; transform: translateY(30px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .hero-content {
            animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}
      </style>

      {/* Main Content */}
      <div className="hero-content" style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 10, padding: '20px', textAlign: 'center'
      }}>
        {/* Logo */}
        <div style={{
          width: 72, height: 72, background: 'linear-gradient(135deg, #6366F1, #818CF8)',
          borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 32, boxShadow: '0 12px 32px rgba(99,102,241,0.3)'
        }}>
          <span style={{ color: '#FFF', fontSize: 36, fontWeight: 800 }}>L</span>
        </div>

        {/* Title */}
        <h1 style={{
          margin: '0 0 16px 0', fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, color: '#0F172A',
          letterSpacing: '-0.02em', lineHeight: 1.1, maxWidth: 800
        }}>
          Revamp Matchmaking <span style={{ background: 'linear-gradient(to right, #6366F1, #818CF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>LINT</span> Apps
        </h1>

        {/* Subtitle */}
        <p style={{ margin: '0 0 48px 0', fontSize: 'clamp(16px, 2vw, 20px)', color: '#64748B', fontWeight: 500 }}>
          Developed by Akbar
        </p>

        {/* CTA Button */}
        <button onClick={onLogin} style={{
          background: 'linear-gradient(to right, #6366F1, #4F46E5)', color: '#FFFFFF',
          border: 'none', padding: '16px 40px', borderRadius: 12, fontSize: 16, fontWeight: 700,
          cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.4), 0 8px 10px -6px rgba(79, 70, 229, 0.1)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(79, 70, 229, 0.4), 0 8px 10px -6px rgba(79, 70, 229, 0.1)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(79, 70, 229, 0.4), 0 8px 10px -6px rgba(79, 70, 229, 0.1)';
        }}
        >
          Masuk ke Dashboard
        </button>

        {/* Small contact text */}
        <p style={{ margin: '32px 0 0 0', fontSize: 13, color: '#64748B', fontWeight: 500 }}>
          If any case, please contact Akbar
        </p>
      </div>

      {/* Footer */}
      <div style={{
        padding: '24px', textAlign: 'center', position: 'relative', zIndex: 10,
        fontSize: 12, color: '#94A3B8', fontWeight: 500
      }}>
        © 2026 LINT · Tim Ops
      </div>
    </div>
  );
}

import React from 'react';
import { supabase } from '../lib/supabase';
import { LogIn } from 'lucide-react';

function Login() {
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // 리디렉션 주소는 환경에 따라 달라질 수 있습니다. (Vercel 배포 주소 또는 로컬호스트)
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error) {
      alert('로그인 중 오류가 발생했습니다: ' + error.message);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-color)',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'var(--card-bg)',
        padding: '40px',
        borderRadius: '16px',
        boxShadow: 'var(--shadow-md)',
        textAlign: 'center',
        maxWidth: '400px',
        width: '100%'
      }}>
        {/* 로고 아이콘과 제목 */}
        <div style={{
          backgroundColor: 'var(--primary-color)',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <LogIn size={32} color="#ffffff" />
        </div>
        
        <h1 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: 'var(--text-color)',
          marginBottom: '8px'
        }}>
          스크린골프 관리자
        </h1>
        <p style={{
          fontSize: '14px',
          color: 'var(--text-muted)',
          marginBottom: '32px'
        }}>
          서비스를 이용하려면 로그인해 주세요.
        </p>

        {/* 구글 로그인 버튼 */}
        <button 
          onClick={handleGoogleLogin}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            width: '100%',
            padding: '14px',
            backgroundColor: '#ffffff',
            color: '#333333',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s, box-shadow 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#f8f9fa';
            e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
          }}
        >
          {/* 구글 G 로고 SVG */}
          <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google 계정으로 로그인
        </button>
      </div>
    </div>
  );
}

export default Login;

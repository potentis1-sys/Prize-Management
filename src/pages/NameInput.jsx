import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Flag, LogOut } from 'lucide-react';

function NameInput({ session, onSave }) {
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);

  // 화면 마운트 완료 시 강제로 텍스트 박스에 포커스 주입
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // 한글 이름 유효성 검사 (공백 제외 한글 2~10자)
  const validateName = (val) => {
    const koreanRegex = /^[가-힣]{2,10}$/;
    if (!val.trim()) {
      return '이름을 입력해 주세요.';
    }
    if (!koreanRegex.test(val.trim())) {
      return '올바른 한글 이름(2~10자)을 입력해 주세요.';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const validationError = validateName(name);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      // Supabase profiles 테이블에 저장 (upsert)
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          full_name: name.trim(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      // 부모 컴포넌트에 한글 이름이 성공적으로 저장되었음을 알림
      onSave(name.trim());
    } catch (err) {
      console.error('이름 저장 에러:', err);
      setErrorMsg('이름을 저장하는 동안 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: 'var(--bg-color)',
      animation: 'fadeIn var(--transition-normal) forwards'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '360px',
        padding: '30px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {/* 심플한 골프 로고 아이콘 */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            backgroundColor: 'var(--primary-color)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <Flag size={24} color="#ffffff" fill="#ffffff" />
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px' }}>
            이름 설정
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            시스템 이용을 위해 본인의 <strong>한글 실명</strong>을 설정해 주세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="koreanName">이름 (실명)</label>
            <input
              ref={inputRef}
              id="koreanName"
              type="text"
              placeholder="예: 홍길동"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              disabled={isSubmitting}
              style={{
                borderColor: errorMsg ? 'var(--danger-color)' : 'var(--border-color)',
                boxShadow: errorMsg ? '0 0 0 3px rgba(160, 74, 74, 0.2)' : undefined
              }}
            />
            {errorMsg && (
              <span style={{
                color: 'var(--danger-color)',
                fontSize: '0.8rem',
                fontWeight: '500',
                marginLeft: '4px',
                marginTop: '4px'
              }}>
                {errorMsg}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{
              padding: '14px',
              fontSize: '1rem',
              display: 'flex',
              gap: '8px'
            }}
          >
            {isSubmitting ? '저장 중...' : '저장 및 시작하기'}
          </button>
        </form>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0' }} />

        {/* 구글 계정으로 로그인한 상태에서 다른 계정 전환을 위한 로그아웃 링크 */}
        <button
          onClick={handleLogout}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            textDecoration: 'underline'
          }}
        >
          <LogOut size={14} />
          다른 계정으로 로그인
        </button>
      </div>
    </div>
  );
}

export default NameInput;

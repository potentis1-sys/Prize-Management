import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import EventEntry from './pages/EventEntry';
import PrizeEntry from './pages/PrizeEntry';
import Settlement from './pages/Settlement';
import Dashboard from './pages/Dashboard';
import CalendarView from './pages/CalendarView';
import Login from './pages/Login'; // 새로 만든 로그인 화면
import NameInput from './pages/NameInput'; // 한글 이름 입력 화면

// 앱의 전체 화면 경로(라우팅)를 설정하는 메인 컴포넌트입니다.
function App() {
  const [session, setSession] = useState(null);
  const [profileName, setProfileName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingProfile, setCheckingProfile] = useState(false);

  // Supabase profiles 테이블에서 사용자 한글 이름 정보를 가져옵니다.
  const fetchProfile = async (userId) => {
    setCheckingProfile(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // PGRST116: 데이터가 없는 경우 (한글 이름을 아직 입력하지 않음)
          setProfileName(null);
        } else {
          console.error('프로필 조회 실패:', error);
        }
      } else if (data) {
        setProfileName(data.full_name);
      }
    } catch (err) {
      console.error('프로필 조회 실패:', err);
    } finally {
      setCheckingProfile(false);
    }
  };

  useEffect(() => {
    // 1. 앱이 처음 켜질 때 현재 로그인 세션(정보) 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. 로그인 상태가 변할 때(로그인 완료, 로그아웃) 실시간으로 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setProfileName(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 세션 정보 확인 완료 후 프로필 확인 중일 때도 로딩 완료를 맞춰 줌
  useEffect(() => {
    if (!checkingProfile && session !== null) {
      setLoading(false);
    }
  }, [checkingProfile, session]);

  // 아직 로그인 정보를 확인하는 중이거나 프로필 데이터를 가져오는 중이면 로딩 화면 표시
  if (loading || checkingProfile) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}>
        로딩 중...
      </div>
    );
  }

  // 로그인되지 않은 사용자는 무조건 Login 화면만 볼 수 있습니다. (보안)
  if (!session) {
    return <Login />;
  }

  // 로그인은 되었으나 한글 이름을 등록하지 않은 경우, 이름 입력창 강제 노출 (진입 차단)
  if (!profileName) {
    return <NameInput session={session} onSave={(name) => setProfileName(name)} />;
  }

  // 로그인이 완료되고 실명 설정까지 끝난 사용자에게만 보여줄 기존 화면들
  return (
    <Routes>
      {/* Layout 컴포넌트에 session 정보와 저장된 한글 이름(profileName)을 함께 전달합니다. */}
      <Route path="/" element={<Layout session={session} profileName={profileName} />}>
        {/* / 주소(기본 화면)일 때 EventEntry 컴포넌트를 보여줍니다. */}
        <Route index element={<EventEntry />} />
        
        {/* /calendar 주소일 때 참가 내역 조회(캘린더) 화면을 보여줍니다. */}
        <Route path="calendar" element={<CalendarView />} />
        
        {/* /prizes 주소일 때 상금 지급 화면을 보여줍니다. */}
        <Route path="prizes" element={<PrizeEntry />} />
        
        {/* /settlement 주소일 때 일일 정산 화면을 보여줍니다. */}
        <Route path="settlement" element={<Settlement />} />
        
        {/* /dashboard 주소일 때 통계 화면을 보여줍니다. */}
        <Route path="dashboard" element={<Dashboard />} />
      </Route>
      {/* 알 수 없는 주소로 들어오면 메인 화면으로 돌려보냅니다. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

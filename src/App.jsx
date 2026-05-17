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

// 앱의 전체 화면 경로(라우팅)를 설정하는 메인 컴포넌트입니다.
function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. 앱이 처음 켜질 때 현재 로그인 세션(정보) 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. 로그인 상태가 변할 때(로그인 완료, 로그아웃) 실시간으로 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 아직 로그인 정보를 확인하는 중이면 로딩 화면 표시
  if (loading) {
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

  // 로그인이 완료된 사용자에게만 보여줄 기존 화면들
  return (
    <Routes>
      {/* Layout 컴포넌트에 session 정보를 전달하여, 헤더에서 프로필을 띄울 수 있게 합니다. */}
      <Route path="/" element={<Layout session={session} />}>
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

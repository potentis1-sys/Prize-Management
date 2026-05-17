import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Users, Calendar, Gift, Calculator, BarChart3, Flag } from 'lucide-react'; // Flag 추가
import './Layout.css'; // 레이아웃 전용 CSS

// 모바일 앱 형태의 전체 화면 레이아웃과 하단 네비게이션 바를 제공하는 컴포넌트입니다.
function Layout() {
  const location = useLocation();

  return (
    <div className="app-container">
      {/* 상단 시스템 타이틀 바 수정 */}
      <header className="system-header" style={{
        padding: '16px 20px',
        background: 'var(--primary-color)',
        borderBottom: '1px solid var(--border-color)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px'
      }}>
        {/* 심플한 골프 로고 아이콘 */}
        <div style={{
          width: '28px',
          height: '28px',
          border: '2px solid rgba(255, 255, 255, 0.9)',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Flag size={16} color="rgba(255, 255, 255, 0.9)" fill="rgba(255, 255, 255, 0.9)" />
        </div>
        
        <h2 style={{ 
          margin: 0, 
          fontSize: '1.4rem',
          fontWeight: '700', 
          letterSpacing: '-1px',
          color: 'rgba(255, 255, 255, 0.95)'
        }}>
          고객 이벤트 관리 시스템
        </h2>
      </header>

      {/* 
        Outlet은 현재 URL에 맞는 컴포넌트(페이지)가 렌더링되는 빈 공간(구멍) 역할을 합니다.
      */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* 하단 네비게이션 바 */}
      <nav className="bottom-nav">
        {/* 1. 참가 등록 (기본 화면) */}
        <NavLink 
          to="/" 
          className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
        >
          <Users size={24} />
          <span>참가 등록</span>
        </NavLink>

        {/* 2. 참가 내역 (새로 추가된 캘린더 메뉴) */}
        <NavLink 
          to="/calendar" 
          className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
        >
          <Calendar size={24} />
          <span>참가 내역</span>
        </NavLink>
        
        {/* 3. 상금 지급 */}
        <NavLink to="/prizes" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <Gift size={24} />
          <span>상금 지급</span>
        </NavLink>

        {/* 4. 정산 */}
        <NavLink to="/settlement" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <Calculator size={24} />
          <span>정산</span>
        </NavLink>

        {/* 5. 통계 */}
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <BarChart3 size={24} />
          <span>통계</span>
        </NavLink>
      </nav>
    </div>
  );
}

export default Layout;

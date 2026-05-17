// 중앙 창 노출 테스트 중입니다. 이 내용이 보이시나요?
// -> 네, 아주 잘 보입니다! 지금처럼 제가 파일 수정 도구를 사용해서 코드를 변경해야만 중앙 창에 'Accept change' 버튼과 변경 사항이 나타납니다.
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import EventEntry from './pages/EventEntry';
import PrizeEntry from './pages/PrizeEntry';
import Settlement from './pages/Settlement';
import Dashboard from './pages/Dashboard';
import CalendarView from './pages/CalendarView'; // 캘린더 화면 추가

// 앱의 전체 화면 경로(라우팅)를 설정하는 메인 컴포넌트입니다.
function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
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
    </Routes>
  );
}

export default App;

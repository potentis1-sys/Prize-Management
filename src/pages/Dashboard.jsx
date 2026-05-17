import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart3, Calendar, TrendingUp, TrendingDown } from 'lucide-react';

const getLocalDateStr = (date = new Date()) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

// 네 번째 화면: 통계 대시보드 및 내역 조회 페이지
function Dashboard() {
  const [stats, setStats] = useState({ totalIncome: 0, totalPrizes: 0 });
  const [recentEvents, setRecentEvents] = useState([]);
  
  // 날짜별 조회를 위한 상태 추가
  const [selectedDate, setSelectedDate] = useState(getLocalDateStr());
  const [dailyData, setDailyData] = useState({ events: [], prizes: [] });

  // 기간별 조회를 위한 상태 추가 (최근 한 달)
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const [periodStartDate, setPeriodStartDate] = useState(getLocalDateStr(oneMonthAgo));
  const [periodEndDate, setPeriodEndDate] = useState(getLocalDateStr());
  const [periodData, setPeriodData] = useState({ events: [], prizes: [] });
  
  const [loading, setLoading] = useState(true);

  // 통계 데이터를 불러오는 함수
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. 모든 이벤트(참가비) 내역 불러오기 (최신순 5개만 조회하여 목록에 표시)
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;

      // 2. 모든 상금 지급 내역 불러오기
      const { data: prizes, error: prizesError } = await supabase
        .from('prizes')
        .select('*')
        .order('created_at', { ascending: false });

      if (prizesError) throw prizesError;

      // 총 수입과 총 지출 계산
      const income = events.reduce((sum, item) => sum + item.entry_fee, 0);
      const outcome = prizes.reduce((sum, item) => sum + item.amount, 0);

      setStats({ totalIncome: income, totalPrizes: outcome });
      setRecentEvents(events.slice(0, 5)); // 최신 5개만 목록용으로 저장
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  // 선택한 날짜의 데이터만 불러오는 함수
  const fetchDailyData = async (date) => {
    try {
      const startOfDay = new Date(`${date}T00:00:00`).toISOString();
      const endOfDay = new Date(`${date}T23:59:59.999`).toISOString();

      // 해당 날짜 이벤트 조회 (시간 범위로 검색)
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', startOfDay)
        .lte('event_date', endOfDay)
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;

      // 해당 날짜 상금 조회 (버그3 수정: prize_date가 TIMESTAMPTZ이므로 범위 쿼리로 통일)
      const startOfPrizeDay = new Date(`${date}T00:00:00`).toISOString();
      const endOfPrizeDay = new Date(`${date}T23:59:59.999`).toISOString();
      const { data: prizes, error: prizesError } = await supabase
        .from('prizes')
        .select('*')
        .gte('prize_date', startOfPrizeDay)
        .lte('prize_date', endOfPrizeDay)
        .order('created_at', { ascending: false });

      if (prizesError) throw prizesError;

      setDailyData({ events: events || [], prizes: prizes || [] });
    } catch (error) {
      console.error('Error fetching daily data:', error);
    }
  };

  // 선택한 기간(시작일~종료일)의 데이터만 불러오는 함수
  const fetchPeriodData = async (start, end) => {
    try {
      const startOfDay = new Date(`${start}T00:00:00`).toISOString();
      const endOfDay = new Date(`${end}T23:59:59.999`).toISOString();

      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', startOfDay)
        .lte('event_date', endOfDay);

      if (eventsError) throw eventsError;

      const { data: prizes, error: prizesError } = await supabase
        .from('prizes')
        .select('*')
        .gte('prize_date', start)
        .lte('prize_date', end);

      if (prizesError) throw prizesError;

      setPeriodData({ events: events || [], prizes: prizes || [] });
    } catch (error) {
      console.error('Error fetching period data:', error);
    }
  };

  // 초기 데이터 및 날짜 변경 시 호출
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await fetchDashboardData();
      await fetchDailyData(selectedDate);
      await fetchPeriodData(periodStartDate, periodEndDate); // 기간별 데이터 호출 추가
      setLoading(false);
    };
    loadAll();
  }, [selectedDate, periodStartDate, periodEndDate]); // 의존성 배열에 기간 상태 추가

  // 총합계 중 수입과 지출의 비율을 계산하여 그래프(바) 길이에 활용합니다.
  const totalMoneyFlow = stats.totalIncome + stats.totalPrizes;
  const incomePercent = totalMoneyFlow > 0 ? (stats.totalIncome / totalMoneyFlow) * 100 : 0;
  const outcomePercent = totalMoneyFlow > 0 ? (stats.totalPrizes / totalMoneyFlow) * 100 : 0;

  // [추가된 부분] 선택한 날짜의 일일 참가비 합계와 상금 지출 합계를 계산합니다.
  // 배열의 reduce 함수를 사용하여 각 내역의 금액을 모두 더합니다.
  const dailyIncome = dailyData.events.reduce((sum, item) => sum + (item.entry_fee || 0), 0);
  const dailyOutcome = dailyData.prizes.reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <div className="container animate-fade-in">
      <header className="flex-between" style={{ marginBottom: '24px' }}>
        <h1 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
          <BarChart3 size={22} />
          통계 대시보드
        </h1>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          데이터를 불러오는 중입니다...
        </div>
      ) : (
        <>
          {/* 전체 수입/지출 요약 카드 */}
          <div className="glass-card" style={{ marginBottom: '20px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <TrendingUp size={16} /> 전체 재무 현황
            </h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <p style={{ fontSize: '0.8rem' }}>총 참가비 수입</p>
                <p style={{ color: 'var(--success-color)', fontWeight: 'bold', fontSize: '1.2rem' }}>
                  {stats.totalIncome.toLocaleString()} 원
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.8rem' }}>총 상금 지출</p>
                <p style={{ color: 'var(--danger-color)', fontWeight: 'bold', fontSize: '1.2rem' }}>
                  {stats.totalPrizes.toLocaleString()} 원
                </p>
              </div>
            </div>

            {/* 비율을 나타내는 CSS 그래프 (막대바) */}
            <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', display: 'flex', overflow: 'hidden' }}>
              <div style={{ width: `${incomePercent}%`, background: 'var(--success-color)' }}></div>
              <div style={{ width: `${outcomePercent}%`, background: 'var(--danger-color)' }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <span>{incomePercent.toFixed(1)}%</span>
              <span>{outcomePercent.toFixed(1)}%</span>
            </div>
          </div>

          {/* 캘린더를 이용한 일별 상세 조회 카드 */}
          <div className="glass-card" style={{ marginBottom: '20px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <Calendar size={16} /> 날짜별 상세 내역 조회
            </h3>
            
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ fontSize: '1rem', padding: '12px', background: '#FFFFFF', color: 'var(--text-primary)' }}
              />
            </div>

            {/* [추가된 부분] 선택한 날짜의 합계 금액을 화면에 보여주는 영역입니다. */}
            <div style={{ 
              marginBottom: '20px', 
              padding: '16px',
              background: 'rgba(103, 68, 47, 0.05)', 
              borderRadius: '12px',
              border: '1px solid var(--border-color)', 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                {/* 일일 참가비 합계 표시 */}
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>일일 참가비 합계</span>
                <div style={{ fontWeight: 'bold', color: 'var(--primary-color)', fontSize: '1.2rem' }}>
                  {dailyIncome.toLocaleString()}원
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {/* 일일 상금 지출 표시 */}
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>일일 상금 지출</span>
                <div style={{ fontWeight: 'bold', color: 'var(--danger-color)', fontSize: '1.2rem' }}>
                  {dailyOutcome.toLocaleString()}원
                </div>
              </div>
            </div>

            <h4 style={{ fontSize: '0.85rem', color: 'var(--primary-color)', marginBottom: '8px' }}>참가 내역 ({dailyData.events.length}건)</h4>
            {dailyData.events.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>참가 내역이 없습니다.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '16px' }}>
                {dailyData.events.map((event) => (
                  <li key={event.id} style={{ borderBottom: '1px solid var(--border-color)', padding: '8px 0', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>{event.room_number}방 - {event.customer_name}</span>
                    <span style={{ color: 'var(--success-color)' }}>+{event.entry_fee.toLocaleString()}원</span>
                  </li>
                ))}
              </ul>
            )}

            <h4 style={{ fontSize: '0.85rem', color: 'var(--danger-color)', marginBottom: '8px' }}>상금 지급 내역 ({dailyData.prizes.length}건)</h4>
            {dailyData.prizes.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>지급 내역이 없습니다.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {dailyData.prizes.map((prize) => (
                  <li key={prize.id} style={{ borderBottom: '1px solid var(--border-color)', padding: '8px 0', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>
                      {prize.room_number ? `${prize.room_number} - ` : ''}
                      {prize.recipient_name}
                    </span>
                    <span style={{ color: 'var(--danger-color)' }}>-{prize.amount.toLocaleString()}원</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 기간별 합계 조회 카드 */}
          <div className="glass-card" style={{ marginBottom: '20px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <Calendar size={16} /> 기간별 합계 조회 {
                periodStartDate === getLocalDateStr(oneMonthAgo) && periodEndDate === getLocalDateStr(new Date()) 
                  ? '(최근 한달)' 
                  : '(선택한 기간)'
              }
            </h3>
            
            {/* 시작일과 종료일을 선택하는 입력창 */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
              <input 
                type="date" 
                value={periodStartDate}
                onChange={(e) => setPeriodStartDate(e.target.value)}
                style={{ flex: 1, fontSize: '0.9rem', padding: '12px', background: '#FFFFFF', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>~</span>
              <input 
                type="date" 
                value={periodEndDate}
                onChange={(e) => setPeriodEndDate(e.target.value)}
                style={{ flex: 1, fontSize: '0.9rem', padding: '12px', background: '#FFFFFF', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
              />
            </div>

            <div style={{ 
              padding: '16px',
              background: 'rgba(103, 68, 47, 0.05)', 
              borderRadius: '12px',
              border: '1px solid var(--border-color)', 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>기간 참가비 합계</span>
                <div style={{ fontWeight: 'bold', color: 'var(--primary-color)', fontSize: '1.2rem' }}>
                  {periodData.events.reduce((sum, item) => sum + (item.entry_fee || 0), 0).toLocaleString()}원
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>기간 상금 지출</span>
                <div style={{ fontWeight: 'bold', color: 'var(--danger-color)', fontSize: '1.2rem' }}>
                  {periodData.prizes.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString()}원
                </div>
              </div>
            </div>
          </div>

        </>
      )}
    </div>
  );
}

export default Dashboard;

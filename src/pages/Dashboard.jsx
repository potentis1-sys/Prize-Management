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
  const [last7DaysData, setLast7DaysData] = useState([]);
  const [last6MonthsData, setLast6MonthsData] = useState([]); // 최근 6개월 상태 추가
  
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

      // 최근 7일간의 참가비 내역 계산 (매일 참가비 합계)
      const days = [];
      const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const date = String(d.getDate()).padStart(2, '0');
        const dayOfWeek = weekDays[d.getDay()];
        days.push({
          dateStr: `${year}-${month}-${date}`,
          dayOfWeek: dayOfWeek
        });
      }

      const chartData = days.map(dayObj => {
        const dateStr = dayObj.dateStr;
        const dailyEvents = events.filter(e => {
          if (!e.event_date) return false;
          const eDate = new Date(e.event_date);
          const eYear = eDate.getFullYear();
          const eMonth = String(eDate.getMonth() + 1).padStart(2, '0');
          const eDay = String(eDate.getDate()).padStart(2, '0');
          return `${eYear}-${eMonth}-${eDay}` === dateStr;
        });
        const totalFee = dailyEvents.reduce((sum, e) => sum + (e.entry_fee || 0), 0);
        return {
          label: `${parseInt(dateStr.split('-')[2])}일`,
          dayOfWeek: `(${dayObj.dayOfWeek})`,
          date: dateStr,
          amount: totalFee
        };
      });
      setLast7DaysData(chartData);

      // 최근 6개월간의 참가비 내역 계산 (월별 참가비 합계 - 31일 버그 방지를 위해 매월 1일 기준 연산)
      const months = [];
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        months.push(`${year}-${month}`);
      }

      const monthlyChartData = months.map(monthStr => {
        const monthlyEvents = events.filter(e => {
          if (!e.event_date) return false;
          const eDate = new Date(e.event_date);
          const eYear = eDate.getFullYear();
          const eMonth = String(eDate.getMonth() + 1).padStart(2, '0');
          return `${eYear}-${eMonth}` === monthStr;
        });
        const totalFee = monthlyEvents.reduce((sum, e) => sum + (e.entry_fee || 0), 0);
        return {
          label: `${parseInt(monthStr.split('-')[1])}월`,
          month: monthStr,
          amount: totalFee
        };
      });
      setLast6MonthsData(monthlyChartData);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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

  // 1. 초기 데이터 로드 (컴포넌트 마운트 시 1회 실행)
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await fetchDashboardData();
      await fetchPeriodData(periodStartDate, periodEndDate);
      setLoading(false);
    };
    loadInitialData();
  }, []);

  // 2. 기간 날짜 변경 시 포커스 잃음 및 깜빡임 방지를 위해 백그라운드에서 데이터를 업데이트
  useEffect(() => {
    if (loading) return; // 초기 로딩 중에는 실행 안 함
    fetchPeriodData(periodStartDate, periodEndDate);
  }, [periodStartDate, periodEndDate]);

  // 총합계 중 수입과 지출의 비율을 계산하여 그래프(바) 길이에 활용합니다.
  const totalMoneyFlow = stats.totalIncome + stats.totalPrizes;
  const incomePercent = totalMoneyFlow > 0 ? (stats.totalIncome / totalMoneyFlow) * 100 : 0;
  const outcomePercent = totalMoneyFlow > 0 ? (stats.totalPrizes / totalMoneyFlow) * 100 : 0;

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

          {/* 최근 7일간 참가비 내역 막대그래프 카드 */}
          <div className="glass-card" style={{ marginBottom: '20px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <BarChart3 size={16} /> 최근 7일간 참가비 내역
            </h3>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-end', 
              height: '160px', 
              padding: '10px 0',
              position: 'relative',
              marginBottom: '4px'
            }}>
              {last7DaysData.map((d, idx) => {
                const maxAmount = Math.max(...last7DaysData.map(item => item.amount), 0);
                const heightPercent = maxAmount > 0 ? (d.amount / maxAmount) * 75 : 0;
                
                return (
                  <div key={idx} style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    flex: 1,
                    height: '100%',
                    justifyContent: 'flex-end',
                    position: 'relative'
                  }}>
                    {/* 상단 금액 표시 */}
                    {d.amount > 0 && (
                      <span style={{ 
                        fontSize: '0.7rem', 
                        fontWeight: 'bold', 
                        color: 'var(--primary-color)',
                        marginBottom: '4px',
                        textAlign: 'center',
                        whiteSpace: 'nowrap'
                      }}>
                        {d.amount >= 10000 
                          ? `${(d.amount / 10000).toFixed(1).replace('.0', '')}만` 
                          : `${(d.amount / 1000).toFixed(0)}천`}
                      </span>
                    )}
                    
                    {/* 막대 바 */}
                    <div style={{ 
                      width: '50%', 
                      maxWidth: '24px',
                      height: d.amount > 0 ? `${heightPercent}%` : '4px', 
                      background: d.amount > 0 
                        ? 'linear-gradient(180deg, var(--primary-color) 0%, var(--border-color) 100%)' 
                        : 'rgba(103, 68, 47, 0.1)', 
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                    title={`${d.date}: ${d.amount.toLocaleString()}원`}
                    />
                    
                    {/* 하단 구분선 */}
                    <div style={{ width: '100%', height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
                    
                    {/* 날짜 및 요일 라벨 */}
                    <span style={{ 
                      fontSize: '0.7rem', 
                      color: 'var(--text-secondary)',
                      marginTop: '2px',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      lineHeight: '1.2'
                    }}>
                      <span>{d.label}</span>
                      <span style={{ 
                        fontSize: '0.65rem', 
                        opacity: d.dayOfWeek === '(토)' || d.dayOfWeek === '(일)' ? '1' : '0.8',
                        color: d.dayOfWeek === '(토)' ? '#2563EB' : d.dayOfWeek === '(일)' ? 'var(--danger-color)' : 'inherit',
                        fontWeight: d.dayOfWeek === '(토)' || d.dayOfWeek === '(일)' ? '600' : 'normal'
                      }}>
                        {d.dayOfWeek}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 최근 6개월간 참가비 내역 막대그래프 카드 */}
          <div className="glass-card" style={{ marginBottom: '20px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <BarChart3 size={16} /> 최근 6개월간 참가비 내역
            </h3>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-end', 
              height: '140px', 
              padding: '10px 0',
              position: 'relative',
              marginBottom: '4px'
            }}>
              {last6MonthsData.map((d, idx) => {
                const maxAmount = Math.max(...last6MonthsData.map(item => item.amount), 0);
                const heightPercent = maxAmount > 0 ? (d.amount / maxAmount) * 75 : 0;
                
                return (
                  <div key={idx} style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    flex: 1,
                    height: '100%',
                    justifyContent: 'flex-end',
                    position: 'relative'
                  }}>
                    {/* 상단 금액 표시 */}
                    {d.amount > 0 && (
                      <span style={{ 
                        fontSize: '0.7rem', 
                        fontWeight: 'bold', 
                        color: 'var(--primary-color)',
                        marginBottom: '4px',
                        textAlign: 'center',
                        whiteSpace: 'nowrap'
                      }}>
                        {d.amount >= 10000 
                          ? `${(d.amount / 10000).toFixed(1).replace('.0', '')}만` 
                          : `${(d.amount / 1000).toFixed(0)}천`}
                      </span>
                    )}
                    
                    {/* 막대 바 */}
                    <div style={{ 
                      width: '50%', 
                      maxWidth: '28px',
                      height: d.amount > 0 ? `${heightPercent}%` : '4px', 
                      background: d.amount > 0 
                        ? 'linear-gradient(180deg, var(--secondary-color) 0%, var(--border-color) 100%)' 
                        : 'rgba(103, 68, 47, 0.1)', 
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                    title={`${d.month}: ${d.amount.toLocaleString()}원`}
                    />
                    
                    {/* 하단 구분선 */}
                    <div style={{ width: '100%', height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
                    
                    {/* 날짜 라벨 */}
                    <span style={{ 
                      fontSize: '0.7rem', 
                      color: 'var(--text-secondary)',
                      marginTop: '2px',
                      whiteSpace: 'nowrap'
                    }}>
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
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

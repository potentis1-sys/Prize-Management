import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ChevronLeft, ChevronRight, ArrowRight, User, Edit3 } from 'lucide-react';

function CalendarView() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthlyEvents, setMonthlyEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMonthlyEvents = async (dateObj) => {
    setLoading(true);
    try {
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
      const startUtc = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000).toISOString();
      const endUtc = new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000).toISOString();

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', startUtc)
        .lte('event_date', endUtc)
        .order('event_date', { ascending: true });

      if (error) throw error;
      setMonthlyEvents(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyEvents(currentDate);
  }, [currentDate.getFullYear(), currentDate.getMonth()]);

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  // 날짜 비교를 위한 헬퍼 (YYYY-MM-DD 형식 반환)
  const getDateKey = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  };

  const totalMonthlyFee = monthlyEvents.reduce((sum, event) => sum + (event.entry_fee || 0), 0);
  const totalMonthlyCount = monthlyEvents.length;
  
  // 현재 선택된 날짜의 이벤트 필터링
  const selectedDateKey = getDateKey(selectedDate);
  const dailyEvents = monthlyEvents.filter(event => getDateKey(event.event_date) === selectedDateKey);

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  // 2026년 기준 한국 주요 공휴일 (대체공휴일 포함)
  const KOREAN_HOLIDAYS = [
    '2026-01-01', // 신정
    '2026-02-16', '2026-02-17', '2026-02-18', // 설날 연휴
    '2026-03-01', '2026-03-02', // 삼일절 및 대체공휴일
    '2026-05-05', // 어린이날
    '2026-05-24', '2026-05-25', // 부처님오신날 및 대체공휴일
    '2026-06-06', // 현충일
    '2026-08-15', // 광복절
    '2026-09-24', '2026-09-25', '2026-09-26', // 추석 연휴
    '2026-10-03', // 개천절
    '2026-10-09', // 한글날
    '2026-12-25'  // 기독탄신일
  ];

  const isRedDay = (dateObj) => {
    return dateObj.getDay() === 0 || KOREAN_HOLIDAYS.includes(getDateKey(dateObj));
  };

  // 달력 그리기용 데이터 생성
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays = [];
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) calendarDays.push({ date: new Date(year, month - 1, daysInPrevMonth - i), current: false });
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push({ date: new Date(year, month, i), current: true });
  const remain = 42 - calendarDays.length;
  for (let i = 1; i <= remain; i++) calendarDays.push({ date: new Date(year, month + 1, i), current: false });

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '80px' }}>
      <header style={{ marginBottom: '20px' }}>
        <h1 className="text-gradient" style={{ fontSize: '1.1rem' }}>내역 조회</h1>
      </header>

      {/* 월간 이동 및 합계 */}
      <div className="glass-card flex-between" style={{ padding: '12px 16px', marginBottom: '16px', justifyContent: 'center', gap: '20px' }}>
        <button onClick={handlePrevMonth} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}><ChevronLeft size={20} /></button>
        <span style={{ fontWeight: 'bold' }}>{year}년 {month + 1}월</span>
        <button onClick={handleNextMonth} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}><ChevronRight size={20} /></button>
      </div>

      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>MONTHLY TOTAL</span>
          <span style={{ fontSize: '0.9rem', display: 'block' }}>참가비 합계 ({totalMonthlyCount}건)</span>
        </div>
        <div style={{ fontWeight: 'bold', fontSize: '1.4rem', color: 'var(--primary-color)' }}>₩{totalMonthlyFee.toLocaleString()}</div>
      </div>

      {/* 달력 그리드 */}
      <div className="glass-card" style={{ padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '12px' }}>
          {weekDays.map((d, i) => <div key={d} style={{ fontSize: '0.8rem', color: i === 0 ? 'var(--danger-color)' : 'var(--text-secondary)' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
          {calendarDays.map((day, i) => {
            const isSel = getDateKey(day.date) === selectedDateKey;
            const isToday = getDateKey(day.date) === getDateKey(new Date());
            // 리스트 갯수와 일치시키기 위해 해당 일자의 이벤트들을 리스트와 동일한 방식으로 그룹화하여 개수를 셉니다.
            const dayEvents = day.current ? monthlyEvents.filter(e => getDateKey(e.event_date) === getDateKey(day.date)) : [];
            const dayGroupsCount = Object.keys(dayEvents.reduce((acc, e) => {
              const k = `${e.event_date}_${e.room_number}`;
              acc[k] = true;
              return acc;
            }, {})).length;
            const isRed = isRedDay(day.date);
            
            return (
              <div key={i} onClick={() => day.current && setSelectedDate(day.date)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50px', borderRadius: '10px', cursor: day.current ? 'pointer' : 'default', background: isSel ? 'var(--primary-color)' : (isToday ? 'rgba(103, 68, 47, 0.1)' : 'transparent'), color: !day.current ? 'rgba(103, 68, 47, 0.3)' : isSel ? 'white' : (isRed ? 'var(--danger-color)' : 'var(--text-primary)'), position: 'relative' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: isSel ? 'bold' : '500', marginBottom: '6px' }}>{day.date.getDate()}</span>
                {dayGroupsCount > 0 && (
                  <div style={{ display: 'flex', gap: '2px', position: 'absolute', bottom: '6px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '90%' }}>
                    {Array.from({ length: dayGroupsCount }).map((_, idx) => (
                      <div key={idx} style={{ width: '4px', height: '4px', borderRadius: '50%', background: isSel ? 'white' : 'var(--primary-color)' }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 일일 상세 내역 섹션 */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ marginBottom: '16px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{weekDays[selectedDate.getDay()]}요일 상세</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일</span>
        </div>

        {/* [중요] 일일 참가비 합계 강조 영역 */}
        <div style={{ 
          marginBottom: '20px', 
          padding: '16px',
          background: 'rgba(103, 68, 47, 0.05)',
          borderRadius: '12px',
          border: '2px solid var(--primary-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>일일 참가비 합계</span>
          <span style={{ fontWeight: 'bold', fontSize: '1.4rem' }}>
            {dailyEvents.reduce((sum, e) => sum + (e.entry_fee || 0), 0).toLocaleString()}원
          </span>
        </div>

        {/* 상세 리스트 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {dailyEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-secondary)' }}>참가 내역이 없습니다.</div>
          ) : (
            Object.values(dailyEvents.reduce((acc, e) => {
              const k = `${e.event_date}_${e.room_number}`;
              // 그룹의 모든 이벤트 ID를 ids 배열에 모아둡니다 (버그2 수정: ID 기반 삭제를 위함)
              if (!acc[k]) acc[k] = { ...e, names: [e.customer_name], fee: e.entry_fee, ids: [e.id] };
              else { acc[k].names.push(e.customer_name); acc[k].fee += e.entry_fee; acc[k].ids.push(e.id); }
              return acc;
            }, {})).map(g => (
              <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#D8CBBF', borderRadius: '12px', borderLeft: '4px solid var(--primary-color)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(g.event_date).getHours()}:{new Date(g.event_date).getMinutes().toString().padStart(2,'0')}</span>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'var(--surface-color)', borderRadius: '6px' }}>{g.room_number}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={16} color="var(--primary-color)" />
                    <span style={{ fontWeight: '600' }}>{g.names.join(', ')}</span>
                  </div>
                </div>
                <div style={{ fontWeight: 'bold' }}>{g.fee.toLocaleString()}원</div>
                <button onClick={() => navigate('/', { state: { editData: g } })} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', marginLeft: '12px' }}><Edit3 size={18} /></button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default CalendarView;

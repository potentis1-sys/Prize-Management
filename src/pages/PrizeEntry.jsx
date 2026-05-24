import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Gift, Send, AlertCircle, History, User, FileText, Edit3, XCircle } from 'lucide-react'; 

// 두 번째 화면: 상금 지급 내역을 입력하고 저장하며, 과거 내역도 확인/수정/삭제하는 페이지
function PrizeEntry() {
  // 수정 모드 관련 상태
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  // 현재 시간을 로컬 시간대 기준 'YYYY-MM-DDThh:mm' 형식으로 가져오는 함수 (10분 단위 내림)
  const getCurrentDateTimeLocal = (date = new Date()) => {
    const minutes = Math.floor(date.getMinutes() / 10) * 10;
    date.setMinutes(minutes);
    date.setSeconds(0);
    date.setMilliseconds(0);
    
    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  };

  // 입력 폼 데이터를 위한 상태
  const [formData, setFormData] = useState({
    prizeDate: getCurrentDateTimeLocal(), 
    recipientName: '',
    roomNumber: '',
    amount: '',
    memo: ''
  });

  // 상금 지급 내역 리스트와 로딩 상태를 위한 변수들
  const [prizes, setPrizes] = useState([]); // 과거 지급 내역을 저장할 배열
  const [loading, setLoading] = useState(false); // 저장 중 로딩 상태
  const [loadingHistory, setLoadingHistory] = useState(true); // 내역 불러오기 로딩 상태
  const [message, setMessage] = useState({ text: '', type: '' }); // 결과 메시지

  // 과거 상금 지급 내역을 데이터베이스에서 가져오는 함수
  const fetchPrizes = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('prizes')
        .select('*')
        .order('prize_date', { ascending: false }); 

      if (error) throw error;
      setPrizes(data || []);
    } catch (error) {
      console.error('내역을 불러오는데 실패했습니다:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // 화면이 처음 나타날 때 내역을 한 번 불러옵니다.
  useEffect(() => {
    fetchPrizes();
  }, []);

  // 숫자에 콤마를 추가하는 함수
  const formatComma = (val) => {
    if (!val) return '';
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // 콤마를 제거하고 숫자만 남기는 함수
  const stripComma = (val) => {
    return val.toString().replace(/,/g, "");
  };

  // 입력창 내용이 바뀔 때 실행되는 함수
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'amount') {
      const onlyNums = stripComma(value).replace(/[^0-9]/g, '');
      setFormData(prev => ({ ...prev, [name]: onlyNums }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // 수정 버튼 클릭 시 실행되는 함수
  const handleEditClick = (prize) => {
    setIsEditMode(true);
    setEditId(prize.id);
    setFormData({
      prizeDate: getCurrentDateTimeLocal(new Date(prize.prize_date)),
      recipientName: prize.recipient_name,
      roomNumber: prize.room_number || '',
      amount: prize.amount.toString(),
      memo: prize.memo || ''
    });
    // 화면 상단으로 스크롤 이동
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 수정 모드 종료 함수
  const handleClose = () => {
    setIsEditMode(false);
    setEditId(null);
    setFormData({
      prizeDate: getCurrentDateTimeLocal(),
      recipientName: '',
      roomNumber: '',
      amount: '',
      memo: ''
    });
    setMessage({ text: '', type: '' });
  };

  // 삭제 실행 함수
  const handleDelete = async (id) => {
    if (!window.confirm('정말로 이 상금 지급 내역을 삭제하시겠습니까?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('prizes')
        .delete()
        .eq('id', id || editId);

      if (error) throw error;

      setMessage({ text: '내역이 성공적으로 삭제되었습니다.', type: 'success' });
      handleClose();
      fetchPrizes();
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      console.error('Error deleting prize:', error);
      setMessage({ text: '삭제 중 오류가 발생했습니다.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 날짜 선택기를 위한 시간 분리 로직
  const [datePart, timePart] = formData.prizeDate.split('T');
  const [hourPart, minutePart] = timePart ? timePart.split(':') : ['00', '00'];

  const handleDatePartChange = (e) => {
    setFormData(prev => ({ ...prev, prizeDate: `${e.target.value}T${hourPart}:${minutePart}` }));
  };
  const handleHourPartChange = (e) => {
    setFormData(prev => ({ ...prev, prizeDate: `${datePart}T${e.target.value}:${minutePart}` }));
  };
  const handleMinutePartChange = (e) => {
    setFormData(prev => ({ ...prev, prizeDate: `${datePart}T${hourPart}:${e.target.value}` }));
  };

  // [저장/수정] 버튼 클릭 시 실행되는 함수
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.recipientName || !formData.amount) {
      setMessage({ text: '수령자 성명과 지급 금액은 필수입니다.', type: 'error' });
      return;
    }

    if (isEditMode && !window.confirm('입력하신 내용으로 상금 내역을 수정하시겠습니까?')) {
      return;
    }

    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      if (isEditMode) {
        // 수정 로직
        const { error } = await supabase
          .from('prizes')
          .update({
            prize_date: new Date(formData.prizeDate).toISOString(),
            recipient_name: formData.recipientName.trim(),
            room_number: formData.roomNumber.trim(),
            amount: parseInt(stripComma(formData.amount), 10) || 0,
            memo: formData.memo.trim()
          })
          .eq('id', editId);
        
        if (error) throw error;
        setMessage({ text: '상금 지급 내역이 수정되었습니다!', type: 'success' });
      } else {
        // 신규 저장 로직
        const { error } = await supabase
          .from('prizes')
          .insert([
            {
              prize_date: new Date(formData.prizeDate).toISOString(), 
              recipient_name: formData.recipientName.trim(),
              room_number: formData.roomNumber.trim(),
              amount: parseInt(stripComma(formData.amount), 10) || 0,
              memo: formData.memo.trim()
            }
          ]);

        if (error) throw error;
        setMessage({ text: '상금 지급 내역이 저장되었습니다!', type: 'success' });
      }
      
      handleClose();
      fetchPrizes();
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      
    } catch (error) {
      console.error('Error saving prize:', error);
      setMessage({ text: '저장 중 오류가 발생했습니다. 다시 시도해 주세요.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 날짜 형식을 예쁘게 바꿔주는 함수
  const formatDisplayDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  };

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '40px' }}>
      <header className="flex-between" style={{ marginBottom: '24px' }}>
        <h1 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
          <Gift size={22} />
          {isEditMode ? '상금 내역 수정' : '상금 지급'}
        </h1>
        {isEditMode && (
          <button onClick={handleClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <XCircle size={28} />
          </button>
        )}
      </header>

      {message.text && (
        <div style={{
          padding: '12px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: message.type === 'success' ? 'rgba(74, 124, 89, 0.2)' : 'rgba(160, 74, 74, 0.2)',
          color: message.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)',
          border: `1px solid ${message.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)'}`
        }}>
          <AlertCircle size={20} />
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{message.text}</span>
        </div>
      )}

      {/* 상금 입력 폼 */}
      <form className="glass-card" onSubmit={handleSubmit} style={{ marginBottom: '32px' }}>
        <div className="form-group">
          <label>* 지급 일시 (10분 단위)</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="date" 
              value={datePart}
              onChange={handleDatePartChange}
              style={{ flex: 1.5, padding: '12px', borderRadius: '10px', background: '#FFFFFF', color: 'var(--text-primary)', border: '1px solid var(--border-color)', outline: 'none' }}
            />
            <select value={hourPart} onChange={handleHourPartChange} style={{ flex: 1, padding: '12px' }}>
              {Array.from({ length: 24 }).map((_, i) => {
                const hr = i.toString().padStart(2, '0');
                return <option key={hr} value={hr} style={{ background: '#FFFFFF' }}>{hr}시</option>;
              })}
            </select>
            <select value={minutePart} onChange={handleMinutePartChange} style={{ flex: 1, padding: '12px' }}>
              {['00', '10', '20', '30', '40', '50'].map(min => (
                <option key={min} value={min} style={{ background: '#FFFFFF' }}>{min}분</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label htmlFor="recipientName">* 수령인 성명</label>
            <input 
              type="text" 
              id="recipientName" 
              name="recipientName" 
              placeholder="예: 홍길동" 
              value={formData.recipientName}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="roomNumber">방 호수</label>
            <input 
              type="text" 
              id="roomNumber" 
              name="roomNumber" 
              placeholder="예: 3번방" 
              value={formData.roomNumber}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="amount">* 지급 금액 (원)</label>
          <input 
            type="text" 
            id="amount" 
            name="amount" 
            placeholder="예: 50,000" 
            value={formatComma(formData.amount)}
            onChange={handleChange}
            inputMode="numeric"
          />
        </div>

        <div className="form-group">
          <label htmlFor="memo">증빙 / 메모</label>
          <textarea 
            id="memo" 
            name="memo" 
            placeholder="예: 홀인원 이벤트 상금 지급" 
            rows="2"
            value={formData.memo}
            onChange={handleChange}
            style={{ resize: 'none' }}
          ></textarea>
        </div>

        {/* 버튼 영역: 모드에 따라 다르게 표시 */}
        <div style={{ marginTop: '12px' }}>
          {!isEditMode ? (
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '저장 중...' : (
                <>
                  <Send size={18} style={{ marginRight: '8px' }} />
                  상금 내역 저장하기
                </>
              )}
            </button>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '12px 0' }} disabled={loading}>
                {loading ? '...' : '수정'}
              </button>
              <button 
                type="button" 
                onClick={() => handleDelete()} 
                className="btn" 
                style={{ 
                  background: 'rgba(160, 74, 74, 0.1)', 
                  color: 'var(--danger-color)', 
                  border: '1px solid var(--danger-color)',
                  padding: '12px 0'
                }} 
                disabled={loading}
              >
                삭제
              </button>
              <button 
                type="button" 
                onClick={handleClose} 
                className="btn btn-outline" 
                style={{ padding: '12px 0' }}
                disabled={loading}
              >
                초기화
              </button>
            </div>
          )}
        </div>
      </form>

      {/* 상금 지급 내역 리스트 및 총액 */}
      <section>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginBottom: '16px',
          padding: '12px 16px',
          background: 'rgba(160, 74, 74, 0.05)',
          borderRadius: '12px',
          border: '1px solid var(--danger-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={20} color="var(--danger-color)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>상금 지급 총 합계</h2>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px', letterSpacing: '0.5px' }}>GRAND TOTAL</span>
            <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--danger-color)' }}>
              ₩{prizes.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
            </span>
          </div>
        </div>

        {loadingHistory ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>내역을 불러오는 중...</div>
        ) : prizes.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            아직 지급된 상금 내역이 없습니다.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {prizes.map((prize) => {
              const pDate = new Date(prize.prize_date);
              return (
                <div key={prize.id} className="animate-fade-in" style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  padding: '16px',
                  background: '#D8CBBF',
                  borderRadius: '12px',
                  borderLeft: '4px solid var(--danger-color)', 
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: prize.memo ? '12px' : '0' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                          {formatDisplayDate(prize.prize_date)}
                        </span>
                        {prize.room_number && (
                          <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '2px 8px', 
                            background: 'var(--surface-color)', 
                            color: 'var(--text-primary)',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            fontWeight: '600'
                          }}>
                            {prize.room_number}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={16} color="var(--danger-color)" />
                        <span style={{ fontWeight: '600', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                          {prize.recipient_name}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1.15rem', color: 'var(--danger-color)' }}>
                          -{prize.amount.toLocaleString()}원
                        </div>
                      </div>
                      {/* 수정 버튼 추가 */}
                      <button 
                        onClick={() => handleEditClick(prize)}
                        style={{ 
                          background: 'rgba(103, 68, 47, 0.1)', 
                          border: 'none', 
                          color: 'var(--primary-color)', 
                          padding: '8px', 
                          borderRadius: '8px', 
                          cursor: 'pointer'
                        }}
                      >
                        <Edit3 size={18} />
                      </button>
                    </div>
                  </div>
                  
                  {prize.memo && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: '6px', 
                      padding: '10px 12px', 
                      background: '#EBE0D3', 
                      borderRadius: '8px'
                    }}>
                      <FileText size={14} style={{ marginTop: '3px', color: 'var(--text-secondary)' }} />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{prize.memo}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default PrizeEntry;

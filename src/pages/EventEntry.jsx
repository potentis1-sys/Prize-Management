import React, { useState, useEffect } from 'react'; // useEffect 추가
import { useNavigate, useLocation } from 'react-router-dom'; // useLocation 추가
import { supabase } from '../lib/supabase';
import { UserPlus, Send, AlertCircle, XCircle, Edit } from 'lucide-react'; 

// 첫 번째 화면: 고객 이벤트 참가 정보를 입력하고 저장하거나, 기존 내역을 수정/삭제하는 페이지
function EventEntry() {
  const navigate = useNavigate();
  const location = useLocation(); // 이전 화면에서 넘어온 데이터를 받기 위함
  
  // 편집 모드 여부를 판단합니다.
  const [isEditMode, setIsEditMode] = useState(false);
  // 수정/삭제 시 사용할 원본 그룹의 ID 배열 (버그2 수정: 날짜+방번호 대신 ID 기반으로 변경)
  const [groupIds, setGroupIds] = useState([]);

  // 현재 시간을 로컬 시간대 기준 'YYYY-MM-DDThh:mm' 형식으로 가져오는 함수 (10분 단위 내림)
  const getCurrentDateTimeLocal = (date = new Date()) => {
    const minutes = Math.floor(date.getMinutes() / 10) * 10;
    date.setMinutes(minutes);
    date.setSeconds(0);
    date.setMilliseconds(0);
    
    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  };

  // 사용자가 입력한 값을 상태(State)로 관리합니다.
  const [formData, setFormData] = useState({
    eventDate: getCurrentDateTimeLocal(),
    roomNumber: '',
    customerNames: ['', '', '', ''],
    entryFee: '',
    isScreenLogin: false,
    memo: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // --- [추가] 편집 모드 데이터 로드 로직 ---
  useEffect(() => {
    if (location.state && location.state.editData) {
      const { editData } = location.state;
      setIsEditMode(true);
      // 전달받은 ids 배열을 저장합니다. ids가 없으면 단일 id를 배열로 감쌉니다.
      setGroupIds(editData.ids || [editData.id]);

      // 데이터 채우기
      setFormData({
        eventDate: getCurrentDateTimeLocal(new Date(editData.event_date)),
        roomNumber: editData.room_number,
        // 그룹화된 이름 배열을 4칸짜리 배열로 맞춥니다.
        customerNames: [
          ...editData.names,
          ...Array(Math.max(0, 4 - editData.names.length)).fill('')
        ].slice(0, 4),
        entryFee: (editData.total_fee / editData.names.length).toString(),
        isScreenLogin: editData.is_screen_login || false,
        memo: editData.memo || ''
      });
    }
  }, [location.state]);

  // 숫자에 콤마를 추가하는 함수
  const formatComma = (val) => {
    if (!val) return '';
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // 콤마를 제거하고 숫자만 남기는 함수
  const stripComma = (val) => {
    return val.toString().replace(/,/g, "");
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'entryFee') {
      const onlyNums = stripComma(value).replace(/[^0-9]/g, '');
      setFormData(prev => ({ ...prev, [name]: onlyNums }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleNameChange = (index, value) => {
    const newNames = [...formData.customerNames];
    newNames[index] = value;
    setFormData(prev => ({ ...prev, customerNames: newNames }));
  };

  const handleEntryFeeChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setFormData(prev => ({ ...prev, entryFee: raw }));
  };

  const formatNumber = (num) => {
    if (!num) return '';
    return parseInt(num, 10).toLocaleString('ko-KR');
  };

  // [등록/수정] 공통 저장 로직
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validNames = formData.customerNames.filter(name => name.trim() !== '');

    if (!formData.roomNumber || validNames.length === 0 || !formData.entryFee) {
      setMessage({ text: '방 호수, 최소 1명의 성명, 참가비는 필수 입력 사항입니다.', type: 'error' });
      return;
    }

    // --- [추가] 수정 모드일 때 한 번 더 확인 ---
    if (isEditMode) {
      if (!window.confirm('입력하신 내용으로 내역을 수정하시겠습니까?')) {
        return;
      }
    }

    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      // 1. 수정 모드라면, 기존 그룹 ID 배열로 해당 레코드들만 정확히 삭제합니다. (버그2 수정)
      if (isEditMode && groupIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('events')
          .delete()
          .in('id', groupIds); // 날짜+방번호 대신 ID 배열로 정확하게 삭제
        
        if (deleteError) throw deleteError;
      }

      // 2. 새로운 데이터를 준비합니다.
      const insertData = validNames.map(name => ({
        event_date: new Date(formData.eventDate).toISOString(),
        room_number: formData.roomNumber,
        customer_name: name.trim(),
        entry_fee: parseInt(formData.entryFee, 10),
        is_screen_login: formData.isScreenLogin,
        memo: formData.memo
      }));

      // 3. 데이터를 저장합니다.
      const { error } = await supabase.from('events').insert(insertData);
      if (error) throw error;

      setMessage({ 
        text: isEditMode ? '내역이 성공적으로 수정되었습니다!' : '참가 내역이 성공적으로 등록되었습니다!', 
        type: 'success' 
      });

      // 4. 저장 후 캘린더 화면으로 이동
      setTimeout(() => {
        navigate('/calendar');
      }, 800);
      
    } catch (error) {
      console.error('Error saving event:', error);
      setMessage({ text: '저장 중 오류가 발생했습니다.', type: 'error' });
      setLoading(false);
    }
  };

  // --- [추가] 삭제 로직 ---
  const handleDelete = async () => {
    if (!window.confirm('정말로 이 참가 내역을 삭제하시겠습니까?')) return;

    setLoading(true);
    try {
      // ID 배열로 정확하게 해당 그룹 레코드만 삭제합니다. (버그2 수정)
      const { error } = await supabase
        .from('events')
        .delete()
        .in('id', groupIds);

      if (error) throw error;

      setMessage({ text: '내역이 삭제되었습니다.', type: 'success' });
      setTimeout(() => navigate('/calendar'), 800);
    } catch (error) {
      console.error('Error deleting event:', error);
      setMessage({ text: '삭제 중 오류가 발생했습니다.', type: 'error' });
      setLoading(false);
    }
  };

  // --- [추가] 닫기 로직 ---
  const handleClose = () => {
    navigate('/calendar');
  };

  // 날짜 선택기 분리 로직
  const [datePart, timePart] = formData.eventDate.split('T');
  const [hourPart, minutePart] = timePart ? timePart.split(':') : ['00', '00'];

  const handleDatePartChange = (e) => {
    setFormData(prev => ({ ...prev, eventDate: `${e.target.value}T${hourPart}:${minutePart}` }));
  };
  const handleHourPartChange = (e) => {
    setFormData(prev => ({ ...prev, eventDate: `${datePart}T${e.target.value}:${minutePart}` }));
  };
  const handleMinutePartChange = (e) => {
    setFormData(prev => ({ ...prev, eventDate: `${datePart}T${hourPart}:${e.target.value}` }));
  };

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '40px' }}>
      <header className="flex-between" style={{ marginBottom: '24px' }}>
        <h1 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
          {isEditMode ? <Edit size={22} /> : <UserPlus size={22} />}
          {isEditMode ? '참가 내역 수정' : '참가 등록'}
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

      <form className="glass-card" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>* 참가 일시 (10분 단위)</label>
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

        <div className="form-group">
          <label htmlFor="roomNumber">* 방 호수</label>
          <input 
            type="text" 
            id="roomNumber" 
            name="roomNumber" 
            placeholder="예: 1번방" 
            value={formData.roomNumber}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>* 고객 성명 (최대 4명)</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {formData.customerNames.map((name, index) => (
              <input 
                key={index}
                type="text" 
                placeholder={`참가자 ${index + 1}`} 
                value={name}
                onChange={(e) => handleNameChange(index, e.target.value)}
              />
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.82rem' }}>* 1인당 참가비 (원)</label>
            <input 
              type="text"
              inputMode="numeric"
              value={formatNumber(formData.entryFee)}
              onChange={handleEntryFeeChange}
              style={{ textAlign: 'right' }}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.82rem' }}>총 참가비</label>
            <input 
              type="text" 
              readOnly
              value={
                formData.entryFee && formData.customerNames.filter(n => n.trim() !== '').length > 0
                  ? `${(parseInt(formData.entryFee, 10) * formData.customerNames.filter(n => n.trim() !== '').length).toLocaleString()}원`
                  : '-'
              }
              style={{ background: '#EBE0D3', textAlign: 'right', fontWeight: 'bold', color: 'var(--primary-color)' }}
            />
          </div>
        </div>

        <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', marginTop: '8px', marginBottom: '16px' }}>
          <input 
            type="checkbox" 
            id="isScreenLogin" 
            name="isScreenLogin" 
            checked={formData.isScreenLogin}
            onChange={handleChange}
            style={{ width: '20px', height: '20px' }}
          />
          <label htmlFor="isScreenLogin" style={{ cursor: 'pointer', margin: 0 }}>스크린 로그인 완료</label>
        </div>

        <div className="form-group">
          <label htmlFor="memo">비고 / 메모</label>
          <textarea 
            id="memo" 
            name="memo" 
            rows="2"
            value={formData.memo}
            onChange={handleChange}
            style={{ resize: 'none' }}
          ></textarea>
        </div>

        {/* 버튼 영역: 모드에 따라 다르게 표시 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
          {!isEditMode ? (
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '저장 중...' : <><Send size={18} style={{ marginRight: '8px' }} /> 참가 내역 등록하기</>}
            </button>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '12px 0' }} disabled={loading}>
                {loading ? '...' : '수정'}
              </button>
              <button 
                type="button" 
                onClick={handleDelete} 
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
    </div>
  );
}

export default EventEntry;

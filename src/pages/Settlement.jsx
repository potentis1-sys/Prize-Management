import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calculator, Save, AlertCircle, History, FileText, CheckCircle2, Edit3, XCircle } from 'lucide-react';

// 세 번째 화면: 수입과 지출을 정산하고 마감 기록을 리스트로 관리하며 수정/삭제까지 가능한 페이지
function Settlement() {
  // 수정 모드 관련 상태
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [historicalEntryFee, setHistoricalEntryFee] = useState(null); // 수정 모드일 때 당시의 참가비 총합 유지

  const [totals, setTotals] = useState({ entryFees: 0, prizes: 0, calculated: 0 });
  const [actualCash, setActualCash] = useState('');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // 정산 내역 리스트를 위한 상태
  const [settlementHistory, setSettlementHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // 현재 시간을 로컬 시간대 기준 'YYYY-MM-DDThh:mm' 형식으로 가져오는 함수 (10분 단위 내림)
  const getCurrentDateTimeLocal = (date = new Date()) => {
    const minutes = Math.floor(date.getMinutes() / 10) * 10;
    date.setMinutes(minutes);
    date.setSeconds(0);
    date.setMilliseconds(0);

    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  };

  const [settlementDate, setSettlementDate] = useState(getCurrentDateTimeLocal());

  // 데이터 가져오기 (전체 합계 및 정산 이력)
  const fetchData = async () => {
    setLoading(true);
    setLoadingHistory(true);
    try {
      const { data: events } = await supabase.from('events').select('entry_fee');
      const { data: prizes } = await supabase.from('prizes').select('amount');

      const totalEntryFees = events ? events.reduce((sum, item) => sum + item.entry_fee, 0) : 0;
      const totalPrizes = prizes ? prizes.reduce((sum, item) => sum + item.amount, 0) : 0;
      const calculatedTotal = totalEntryFees - totalPrizes;

      setTotals({
        entryFees: totalEntryFees,
        prizes: totalPrizes,
        calculated: calculatedTotal
      });

      const { data: history, error: historyError } = await supabase
        .from('settlements')
        .select('*')
        .order('settlement_date', { ascending: false });

      if (historyError) throw historyError;
      setSettlementHistory(history || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ text: '데이터를 불러오는 중 오류가 발생했습니다.', type: 'error' });
    } finally {
      setLoading(false);
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchData();
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

  const handleCashChange = (e) => {
    const val = e.target.value;
    const onlyNums = stripComma(val).replace(/[^0-9]/g, '');
    setActualCash(onlyNums);
  };

  // 날짜 선택기 관련 로직
  const [datePart, timePart] = settlementDate.split('T');
  const [hourPart, minutePart] = timePart ? timePart.split(':') : ['00', '00'];

  const handleDatePartChange = (e) => {
    setSettlementDate(`${e.target.value}T${hourPart}:${minutePart}`);
  };
  const handleHourPartChange = (e) => {
    setSettlementDate(`${datePart}T${e.target.value}:${minutePart}`);
  };
  const handleMinutePartChange = (e) => {
    setSettlementDate(`${datePart}T${hourPart}:${e.target.value}`);
  };

  // 수정 버튼 클릭 시
  const handleEditClick = (item) => {
    setIsEditMode(true);
    setEditId(item.id);
    setSettlementDate(getCurrentDateTimeLocal(new Date(item.settlement_date)));
    setActualCash(item.actual_cash.toString());
    setMemo(item.memo || '');
    setHistoricalEntryFee(item.calculated_total); // 당시 저장된 참가비 총합 유지
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 초기화 (수정 모드 종료)
  const handleClose = () => {
    setIsEditMode(false);
    setEditId(null);
    setSettlementDate(getCurrentDateTimeLocal());
    setActualCash('');
    setMemo('');
    setHistoricalEntryFee(null); // 초기화
    setMessage({ text: '', type: '' });
  };

  // 삭제 실행
  const handleDelete = async (id) => {
    if (!window.confirm('정말로 이 정산 기록을 삭제하시겠습니까?')) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('settlements')
        .delete()
        .eq('id', id || editId);

      if (error) throw error;

      setMessage({ text: '정산 기록이 삭제되었습니다.', type: 'success' });
      handleClose();
      fetchData();
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      console.error('Error deleting settlement:', error);
      setMessage({ text: '삭제 중 오류가 발생했습니다.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // 정산 저장/수정 실행
  const handleSaveSettlement = async () => {
    if (actualCash === '') {
      setMessage({ text: '실제 보관 중인 현금을 입력해 주세요.', type: 'error' });
      return;
    }

    if (isEditMode && !window.confirm('입력하신 내용으로 정산 기록을 수정하시겠습니까?')) {
      return;
    }

    setSaving(true);
    setMessage({ text: '', type: '' });

    const cashValue = parseInt(stripComma(actualCash), 10) || 0;
    // 수정 모드일 때는 당시의 계산상 보유액을 유지하고, 새 기록일 때는 현재 계산상 전체 보유액(A-B)을 사용합니다.
    const holdingsToSave = isEditMode && historicalEntryFee !== null ? historicalEntryFee : (totals.entryFees - totals.prizes);
    const discrepancy = cashValue - holdingsToSave;

    try {
      if (isEditMode) {
        const { error } = await supabase
          .from('settlements')
          .update({
            settlement_date: new Date(settlementDate).toISOString(),
            calculated_total: holdingsToSave,
            actual_cash: cashValue,
            discrepancy: discrepancy,
            memo: memo
          })
          .eq('id', editId);
        if (error) throw error;
        setMessage({ text: '정산 기록이 수정되었습니다!', type: 'success' });
      } else {
        const { error } = await supabase
          .from('settlements')
          .insert([
            {
              settlement_date: new Date(settlementDate).toISOString(),
              calculated_total: holdingsToSave,
              actual_cash: cashValue,
              discrepancy: discrepancy,
              memo: memo
            }
          ]);
        if (error) throw error;
        setMessage({ text: '정산 기록이 저장되었습니다!', type: 'success' });
      }

      handleClose();
      fetchData();
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);

    } catch (error) {
      console.error('Error saving settlement:', error);
      setMessage({ text: '처리 중 오류가 발생했습니다.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // 날짜 형식 변환
  const formatDisplayDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '40px' }}>
      <header className="flex-between" style={{ marginBottom: '24px' }}>
        <h1 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
          <Calculator size={22} />
          {isEditMode ? '정산 기록 수정' : '정산 관리'}
        </h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          {isEditMode && (
            <button onClick={handleClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <XCircle size={28} />
            </button>
          )}
        </div>
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

      {loading && !settlementHistory.length ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          데이터를 분석 중입니다...
        </div>
      ) : (
        <>
          {/* 시스템 전체 정산 요약 카드 */}
          <div className="glass-card" style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>시스템 전체 정산 요약</h3>

            {(() => {
              // 가장 최근 정산된 실제 현금 (DB 기준)
              const latestActualCash = settlementHistory.length > 0 ? settlementHistory[0].actual_cash : 0;
              // 현재 입력 중인 값이 있으면 그걸 보여주고, 없으면 DB 최신값을 보여줍니다.
              const displayCash = actualCash !== '' ? (parseInt(stripComma(actualCash), 10) || 0) : latestActualCash;

              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.95rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>참가비 누적 총합 (A)</span>
                    <span style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>{totals.entryFees.toLocaleString()} 원</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.95rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>상금 지급 누적 총합 (B)</span>
                    <span style={{ color: 'var(--danger-color)', fontWeight: 'bold' }}>{totals.prizes.toLocaleString()} 원</span>
                  </div>

                  {/* 점선 구분선 */}
                  <div style={{ borderTop: '1px dashed var(--border-color)', margin: '14px 0' }}></div>

                  {/* 계산상 전체 보유액 (A) - (B) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>계산상 전체 보유액</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>(A) - (B)</span>
                    </div>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {(totals.entryFees - totals.prizes).toLocaleString()} 원
                    </span>
                  </div>

                  {/* 실제 보관 중인 현금 (C) */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '14px',
                    color: 'var(--primary-color)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>실제 보관 중인 현금</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>(C)</span>
                    </div>
                    <span style={{ fontWeight: 'bold', fontSize: '1.35rem' }}>
                      {displayCash.toLocaleString()} 원
                    </span>
                  </div>

                  {/* 현금 차액 배너 (과부족) */}
                  {(() => {
                    const calculatedHoldings = totals.entryFees - totals.prizes;
                    const diff = displayCash - calculatedHoldings;
                    const isMatch = diff === 0;
                    const isExcess = diff > 0;

                    return (
                      <div style={{
                        padding: '12px 16px',
                        borderRadius: '10px',
                        background: isMatch
                          ? 'rgba(74, 124, 89, 0.06)'
                          : isExcess
                            ? 'rgba(201, 138, 68, 0.06)'
                            : 'rgba(160, 74, 74, 0.06)',
                        border: `1px solid ${isMatch
                          ? 'var(--success-color)'
                          : isExcess
                            ? 'var(--warning-color)'
                            : 'var(--danger-color)'
                          }`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '12px'
                      }}>
                        <span style={{
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          color: isMatch
                            ? 'var(--success-color)'
                            : isExcess
                              ? 'var(--warning-color)'
                              : 'var(--danger-color)'
                        }}>
                          계산과 실제 현금 차이 (C) - (A-B)
                        </span>
                        <span style={{
                          fontWeight: 'bold',
                          fontSize: '1.05rem',
                          color: isMatch
                            ? 'var(--success-color)'
                            : isExcess
                              ? 'var(--warning-color)'
                              : 'var(--danger-color)'
                        }}>
                          {isExcess ? '+' : ''}{diff.toLocaleString()} 원
                        </span>
                      </div>
                    );
                  })()}


                </>
              );
            })()}
          </div>

          {/* 정산 입력 폼 */}
          <div className="glass-card" style={{ marginBottom: '32px' }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {isEditMode ? '정산 내역 수정' : '새 정산 기록 남기기'}
            </h3>

            <div className="form-group">
              <label>* 정산 일시 (10분 단위)</label>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.82rem' }}>계산상 전체 보유액 (A-B)</label>
                <input
                  type="text"
                  readOnly
                  value={`${(isEditMode && historicalEntryFee !== null ? historicalEntryFee : (totals.entryFees - totals.prizes)).toLocaleString()} 원`}
                  style={{ background: '#EBE0D3', color: 'var(--success-color)', fontWeight: 'bold' }}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="actualCash" style={{ fontSize: '0.82rem' }}>* 실제 보관 현금 (C)</label>
                <input
                  type="text"
                  id="actualCash"
                  value={formatComma(actualCash)}
                  onChange={handleCashChange}
                  placeholder="입력 (원)"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="memo">정산 메모 (선택)</label>
              <textarea
                id="memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="특이사항 기록"
                rows="2"
                style={{ resize: 'none' }}
              ></textarea>
            </div>

            <div style={{ marginTop: '12px' }}>
              {!isEditMode ? (
                <button onClick={handleSaveSettlement} className="btn btn-primary" disabled={saving}>
                  {saving ? '저장 중...' : (
                    <>
                      <Save size={18} style={{ marginRight: '8px' }} />
                      정산 기록 저장하기
                    </>
                  )}
                </button>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <button onClick={handleSaveSettlement} className="btn btn-primary" style={{ padding: '12px 0' }} disabled={saving}>
                    {saving ? '...' : '수정'}
                  </button>
                  <button
                    onClick={() => handleDelete()}
                    className="btn"
                    style={{
                      background: 'rgba(160, 74, 74, 0.1)',
                      color: 'var(--danger-color)',
                      border: '1px solid var(--danger-color)',
                      padding: '12px 0'
                    }}
                    disabled={saving}
                  >
                    삭제
                  </button>
                  <button
                    onClick={handleClose}
                    className="btn btn-outline"
                    style={{ padding: '12px 0' }}
                    disabled={saving}
                  >
                    초기화
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 과거 정산 이력 리스트 */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <History size={20} color="var(--primary-color)" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>최근 정산 이력</h2>
            </div>

            {loadingHistory ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>내역을 불러오는 중...</div>
            ) : settlementHistory.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                아직 저장된 정산 내역이 없습니다.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {settlementHistory.map((item) => (
                  <div key={item.id} className="animate-fade-in" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '16px',
                    background: '#D8CBBF', /* 밝은 브라운 리스트 배경 */
                    borderRadius: '12px',
                    borderLeft: '4px solid var(--primary-color)',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
                          {formatDisplayDate(item.settlement_date)}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle2 size={16} color="var(--primary-color)" />
                          <span style={{ fontWeight: '600', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                            실제 현금: {item.actual_cash.toLocaleString()}원
                          </span>
                        </div>
                        {/* 당시의 과부족 차액 상태 추가 표기 */}
                        <span style={{ 
                          fontSize: '0.8rem', 
                          fontWeight: 'bold', 
                          color: item.discrepancy === 0 
                            ? 'var(--success-color)' 
                            : item.discrepancy > 0 
                              ? 'var(--warning-color)' 
                              : 'var(--danger-color)',
                          marginLeft: '22px',
                          marginTop: '2px',
                          display: 'block'
                        }}>
                          차액: {item.discrepancy > 0 ? '+' : ''}{item.discrepancy.toLocaleString()}원
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>계산상 보유액</div>
                          <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                            {item.calculated_total.toLocaleString()}원
                          </div>
                        </div>
                        {/* 수정 버튼 추가 */}
                        <button
                          onClick={() => handleEditClick(item)}
                          style={{
                            background: 'rgba(103, 68, 47, 0.1)', /* 수정 버튼 배경을 밝은 톤에 맞춤 */
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
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default Settlement;

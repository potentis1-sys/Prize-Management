-- 000_create_tables.sql
-- 스크린 골프 고객 이벤트 및 상금 관리 시스템을 위한 초기 테이블 생성 스크립트

-- 1. 이벤트 참가 내역 테이블 (events)
-- 고객의 이벤트 참가 정보를 저장합니다.
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  event_date DATE DEFAULT CURRENT_DATE, -- 이벤트 진행 날짜 (통계용)
  room_number VARCHAR(50) NOT NULL,     -- 방 호수
  customer_name VARCHAR(100) NOT NULL,  -- 고객 성명
  entry_fee INTEGER NOT NULL DEFAULT 0, -- 참가비 (숫자형)
  is_screen_login BOOLEAN DEFAULT false,-- 스크린 로그인 여부
  memo TEXT                             -- 비고/메모
);

-- 2. 상금 지급 내역 테이블 (prizes)
-- 이벤트 결과에 따른 상금 지급 내역을 저장합니다.
CREATE TABLE IF NOT EXISTS prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  prize_date DATE DEFAULT CURRENT_DATE, -- 상금 지급 날짜 (통계용)
  recipient_name VARCHAR(100) NOT NULL, -- 상금 수령자 성명
  amount INTEGER NOT NULL DEFAULT 0,    -- 지급 금액
  memo TEXT                             -- 증빙/비고/메모
);

-- 3. 일일 정산 및 오차 관리 테이블 (settlements)
-- 하루 단위의 총 합계와 실제 현금을 비교하여 오차를 기록합니다.
CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  settlement_date DATE UNIQUE DEFAULT CURRENT_DATE, -- 정산 날짜 (하루 1개만 존재하도록 UNIQUE 설정)
  calculated_total INTEGER NOT NULL DEFAULT 0,      -- 시스템상 계산된 총액 (참가비 총합 - 상금 총합)
  actual_cash INTEGER NOT NULL DEFAULT 0,           -- 실제 보관 중인 현금
  discrepancy INTEGER NOT NULL DEFAULT 0,           -- 오차 금액 (actual_cash - calculated_total)
  memo TEXT                                         -- 비고/메모
);

-- RLS (Row Level Security) 설정
-- 테스트 및 초기 개발을 위해 일단 모두 접근 가능하도록 허용합니다. (실제 서비스 시 보안 규칙 필요)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for events" ON events FOR ALL USING (true);
CREATE POLICY "Allow all operations for prizes" ON prizes FOR ALL USING (true);
CREATE POLICY "Allow all operations for settlements" ON settlements FOR ALL USING (true);

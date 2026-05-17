-- 001_alter_event_date_type.sql
-- 이벤트 참가 날짜(event_date) 컬럼을 날짜(DATE)에서 시간까지 저장할 수 있는 TIMESTAMPTZ로 변경합니다.

ALTER TABLE events ALTER COLUMN event_date TYPE TIMESTAMPTZ USING event_date::timestamptz;

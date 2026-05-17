-- 002_alter_prize_date_type.sql
-- 상금 지급 날짜(prize_date) 컬럼을 날짜(DATE)에서 시간까지 저장할 수 있는 TIMESTAMPTZ로 변경합니다.

ALTER TABLE prizes ALTER COLUMN prize_date TYPE TIMESTAMPTZ USING prize_date::timestamptz;

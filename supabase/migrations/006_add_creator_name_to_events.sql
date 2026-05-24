-- 006_add_creator_name_to_events.sql
-- events 테이블에 입력자 한글 이름을 저장할 creator_name 컬럼 추가

ALTER TABLE events ADD COLUMN IF NOT EXISTS creator_name VARCHAR(100);

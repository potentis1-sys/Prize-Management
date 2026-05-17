-- 004_remove_unique_settlement_date.sql
-- settlement_date 컬럼의 UNIQUE 제약 조건을 제거합니다.
-- 기존에는 하루에 정산 기록을 1건만 저장할 수 있었으나,
-- 실제 운영에서는 하루에 여러 번 정산이 필요할 수 있으므로 제약을 해제합니다.

ALTER TABLE settlements DROP CONSTRAINT IF EXISTS settlements_settlement_date_key;

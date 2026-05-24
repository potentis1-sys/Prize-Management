-- 005_create_profiles_table.sql
-- 사용자 프로필(한글 이름) 관리를 위한 테이블 생성 스크립트

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  full_name VARCHAR(100) NOT NULL
);

-- RLS 활성화 및 권한 설정
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 모든 작업(SELECT, INSERT, UPDATE, DELETE)을 허용하는 간단한 정책 설정
CREATE POLICY "Allow all operations for profiles" ON profiles FOR ALL USING (true);

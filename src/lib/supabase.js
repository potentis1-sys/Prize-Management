import { createClient } from '@supabase/supabase-js';

// 환경 변수에서 Supabase URL과 Anon Key를 가져옵니다.
// 프로젝트 루트에 .env.local 파일을 생성하고 아래 값을 입력해야 합니다.
// VITE_SUPABASE_URL=당신의_SUPABASE_URL
// VITE_SUPABASE_ANON_KEY=당신의_SUPABASE_ANON_KEY

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// .env.local 파일에서 Supabase 설정값 읽기
const envPath = path.join(__dirname, '..', '.env.local');
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split(/\r?\n/);
  for (const line of lines) {
    if (line.trim().startsWith('#')) continue;
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') {
        supabaseUrl = val;
      } else if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
        supabaseAnonKey = val;
      }
    }
  }
}

console.log('Detected Supabase URL:', supabaseUrl);

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project-ref')) {
  console.error('Error: No valid Supabase configuration found in .env.local.');
  console.log('Please make sure you have set up NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY correctly.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Deleting profiles from database...');
  
  // 모든 학생의 프로필 데이터를 profiles 테이블에서 일괄 삭제합니다.
  const { data, error } = await supabase
    .from('profiles')
    .delete()
    .neq('student_id', '');

  if (error) {
    console.error('Failed to delete profiles:', error.message);
    process.exit(1);
  } else {
    console.log('Successfully deleted all student login records (profiles).');
    process.exit(0);
  }
}

run();

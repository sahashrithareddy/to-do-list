import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nqfzfkvtppzphtawfrhs.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xZnpma3Z0cHB6cGh0YXdmcmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2MDA1MzcsImV4cCI6MjEwNzE3NjUzN30.HtJqImBmFkl18LBQr_TuWP1jxep0KcSb9A_uYEaEuyI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

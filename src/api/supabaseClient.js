import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://whaogopjlqzaricskrrq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoYW9nb3BqbHF6YXJpY3NrcnJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNzY4NjMsImV4cCI6MjA3NTg1Mjg2M30.RpCdjR_st7PzJPSDBau21N0i1FdpfY0NjvPeKf_VRv0';

export const supabase = createClient(supabaseUrl, supabaseKey);

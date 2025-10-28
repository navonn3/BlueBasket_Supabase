import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tykzjhywnrhtkqppgdyn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5a3pqaHl3bnJodGtxcHBnZHluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MzE2MDQsImV4cCI6MjA3NjQwNzYwNH0.j6tHR4S4AXNAxbkzHsU_QcvkrkTusJwmx3Apdh8bjPY';

export const supabase = createClient(supabaseUrl, supabaseKey);

// src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
    'https://ijreiwvgaplcjrjwbrkg.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqcmVpd3ZnYXBsY2pyandicmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NDUyODksImV4cCI6MjA3MTAyMTI4OX0.SWR_vzbCpmcYX7Hg8MxRuhnutlxIBEMQgF8UttP6J_o'
  );

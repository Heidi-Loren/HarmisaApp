// src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
    'https://saqtujjgtkopomwhjult.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhcXR1ampndGtvcG9td2hqdWx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NjUxOTksImV4cCI6MjA2NjU0MTE5OX0.yeoOdJKCj1jebH4WHDz0GIQ-xjRw_-Vb-FTJ65BMjsc'
  );

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  avatar_url: string | null;
}

export function useUsers(searchQuery?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['users', searchQuery],
    queryFn: async (): Promise<UserProfile[]> => {
      let query = supabase.from('profiles').select('*');

      if (searchQuery) {
        query = query.or(`email.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query
        .neq('id', user?.id || '')
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

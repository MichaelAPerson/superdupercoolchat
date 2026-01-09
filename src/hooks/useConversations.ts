import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  participants: {
    id: string;
    email: string;
    username: string | null;
    avatar_url: string | null;
  }[];
  last_message?: {
    content: string | null;
    image_url: string | null;
    created_at: string;
  };
}

export function useConversations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Subscribe to realtime updates for new messages (to update last_message)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          // Refetch conversations when a new message arrives
          queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async (): Promise<Conversation[]> => {
      if (!user) return [];

      // Get conversations the user is part of
      const { data: participations, error: participationsError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (participationsError) throw participationsError;
      if (!participations?.length) return [];

      const conversationIds = participations.map(p => p.conversation_id);

      // Get conversation details with participants
      const { data: conversations, error: conversationsError } = await supabase
        .from('conversations')
        .select('*')
        .in('id', conversationIds)
        .order('updated_at', { ascending: false });

      if (conversationsError) throw conversationsError;

      // Get all participants for these conversations
      const { data: allParticipants, error: allParticipantsError } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', conversationIds);

      if (allParticipantsError) throw allParticipantsError;

      // Get profiles for all participants
      const participantUserIds = [...new Set(allParticipants?.map(p => p.user_id) || [])];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', participantUserIds);

      if (profilesError) throw profilesError;

      // Get last message for each conversation
      const { data: lastMessages, error: messagesError } = await supabase
        .from('messages')
        .select('conversation_id, content, image_url, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      // Group last messages by conversation
      const lastMessageMap = new Map<string, typeof lastMessages[0]>();
      lastMessages?.forEach(msg => {
        if (!lastMessageMap.has(msg.conversation_id)) {
          lastMessageMap.set(msg.conversation_id, msg);
        }
      });

      // Build conversation objects with participants (excluding current user)
      return conversations?.map(conv => {
        const convParticipants = allParticipants
          ?.filter(p => p.conversation_id === conv.id && p.user_id !== user.id)
          .map(p => profiles?.find(profile => profile.id === p.user_id))
          .filter(Boolean)
          .map(p => ({
            id: p!.id,
            email: p!.email,
            username: p!.username,
            avatar_url: p!.avatar_url,
          })) || [];

        return {
          ...conv,
          participants: convParticipants,
          last_message: lastMessageMap.get(conv.id),
        };
      }) || [];
    },
    enabled: !!user,
    refetchInterval: 10000, // Also poll every 10 seconds as backup
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Check if conversation already exists between these two users
      const { data: existingParticipations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (existingParticipations?.length) {
        const { data: otherParticipations } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', otherUserId)
          .in('conversation_id', existingParticipations.map(p => p.conversation_id));

        // Find a conversation with only these 2 users
        for (const participation of otherParticipations || []) {
          const { data: allParticipants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', participation.conversation_id);
          
          if (allParticipants?.length === 2) {
            return participation.conversation_id;
          }
        }
      }

      // Create new conversation using RPC (bypasses RLS safely)
      const { data, error } = await supabase.rpc('create_direct_conversation', {
        _other_user_id: otherUserId,
      });

      if (error) throw error;

      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

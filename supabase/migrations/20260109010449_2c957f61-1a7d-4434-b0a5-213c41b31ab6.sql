-- Prevent infinite recursion in RLS by using SECURITY DEFINER helper functions

-- Helper: is a user a participant in a conversation?
CREATE OR REPLACE FUNCTION public.is_conversation_participant(
  _conversation_id uuid,
  _user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
  );
$$;

-- Helper: how many participants exist for a conversation? (used for bootstrap)
CREATE OR REPLACE FUNCTION public.conversation_participant_count(
  _conversation_id uuid
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.conversation_participants
  WHERE conversation_id = _conversation_id;
$$;

-- =========================
-- conversation_participants
-- =========================
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Authenticated users can add participants" ON public.conversation_participants;

CREATE POLICY "Users can view participants of their conversations"
ON public.conversation_participants
FOR SELECT
USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Authenticated users can add participants"
ON public.conversation_participants
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    -- allow adding yourself
    user_id = auth.uid()
    -- allow adding others once you're already a participant
    OR public.is_conversation_participant(conversation_id, auth.uid())
    -- bootstrap: allow initial inserts into a new conversation
    OR public.conversation_participant_count(conversation_id) = 0
  )
);

-- =================
-- conversations
-- =================
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;

CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
USING (public.is_conversation_participant(id, auth.uid()));

CREATE POLICY "Authenticated users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their conversations"
ON public.conversations
FOR UPDATE
USING (public.is_conversation_participant(id, auth.uid()));

-- ============
-- messages
-- ============
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;

CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Users can send messages to their conversations"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND sender_id = auth.uid()
  AND public.is_conversation_participant(conversation_id, auth.uid())
);

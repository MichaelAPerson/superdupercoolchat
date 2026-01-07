-- Fix conversation creation policy to require authentication
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations" ON public.conversations 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Fix participant add policy to be more specific
DROP POLICY IF EXISTS "Users can add participants" ON public.conversation_participants;
CREATE POLICY "Authenticated users can add participants" ON public.conversation_participants 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
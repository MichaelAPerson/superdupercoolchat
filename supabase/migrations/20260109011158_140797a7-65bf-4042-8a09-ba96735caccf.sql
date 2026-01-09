-- Create a SECURITY DEFINER RPC to create a 1:1 conversation and participants atomically
CREATE OR REPLACE FUNCTION public.create_direct_conversation(
  _other_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _conversation_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF _other_user_id IS NULL THEN
    RAISE EXCEPTION 'missing other user';
  END IF;

  IF _other_user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot create conversation with yourself';
  END IF;

  INSERT INTO public.conversations DEFAULT VALUES
  RETURNING id INTO _conversation_id;

  -- Insert participants in deterministic order
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (_conversation_id, auth.uid());

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (_conversation_id, _other_user_id);

  RETURN _conversation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_direct_conversation(uuid) TO authenticated;
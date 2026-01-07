import { useEffect, useRef, useState } from 'react';
import { useMessages, useSendMessage, Message } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from '@/hooks/useConversations';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Image as ImageIcon, Loader2, ArrowLeft, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChatViewProps {
  conversationId: string | null;
  onBack?: () => void;
}

export default function ChatView({ conversationId, onBack }: ChatViewProps) {
  const { user, signOut } = useAuth();
  const { data: conversations } = useConversations();
  const { data: messages, isLoading } = useMessages(conversationId);
  const sendMessage = useSendMessage();
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const conversation = conversations?.find(c => c.id === conversationId);
  const participant = conversation?.participants[0];

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !conversationId) return;

    try {
      await sendMessage.mutateAsync({
        conversationId,
        content: newMessage.trim(),
      });
      setNewMessage('');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversationId || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName);

      await sendMessage.mutateAsync({
        conversationId,
        imageUrl: publicUrl,
      });
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!conversationId) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background/50">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto glow-effect">
            <Send className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Welcome to ChatFlow</h2>
            <p className="text-muted-foreground">Select a conversation to start messaging</p>
          </div>
        </div>
      </div>
    );
  }

  const displayName = participant?.username || participant?.email || 'Unknown';

  return (
    <div className="h-full flex flex-col bg-background/50">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border glass-effect">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <Avatar className="w-10 h-10">
          <AvatarImage src={participant?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/20 text-primary">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="font-semibold">{displayName}</h2>
          <p className="text-xs text-muted-foreground">{participant?.email}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
          <LogOut className="w-5 h-5" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 chat-scrollbar" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : messages?.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>No messages yet. Say hello! 👋</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages?.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isSent={message.sender_id === user?.id}
                showAvatar={
                  index === 0 ||
                  messages[index - 1]?.sender_id !== message.sender_id
                }
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border glass-effect">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="shrink-0"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ImageIcon className="w-5 h-5" />
            )}
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-input border-border/50 focus:border-primary"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newMessage.trim() || sendMessage.isPending}
            className="shrink-0 bg-primary hover:bg-primary/90"
          >
            {sendMessage.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isSent,
  showAvatar,
}: {
  message: Message;
  isSent: boolean;
  showAvatar: boolean;
}) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div
      className={`flex items-end gap-2 ${isSent ? 'flex-row-reverse' : 'flex-row'} ${
        isSent ? 'slide-in-right' : 'slide-in-left'
      }`}
    >
      {showAvatar && !isSent ? (
        <Avatar className="w-8 h-8">
          <AvatarImage src={message.sender?.avatar_url || undefined} />
          <AvatarFallback className="text-xs bg-primary/20 text-primary">
            {getInitials(message.sender?.username || message.sender?.email || 'U')}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-8" />
      )}
      <div className={`max-w-[70%] ${isSent ? 'items-end' : 'items-start'}`}>
        {message.image_url && (
          <img
            src={message.image_url}
            alt="Shared image"
            className="rounded-lg max-w-full mb-1 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(message.image_url!, '_blank')}
          />
        )}
        {message.content && (
          <div
            className={`px-4 py-2 ${
              isSent ? 'message-bubble-sent' : 'message-bubble-received'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        )}
        <span className={`text-xs text-muted-foreground mt-1 block ${isSent ? 'text-right' : 'text-left'}`}>
          {format(new Date(message.created_at), 'HH:mm')}
        </span>
      </div>
    </div>
  );
}

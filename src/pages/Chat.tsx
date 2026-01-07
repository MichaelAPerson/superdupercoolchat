import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ConversationList from '@/components/chat/ConversationList';
import ChatView from '@/components/chat/ChatView';
import { Loader2 } from 'lucide-react';

export default function Chat() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleSelectConversation = (id: string) => {
    setSelectedConversation(id);
    setShowMobileChat(true);
  };

  const handleBack = () => {
    setShowMobileChat(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Desktop: Side-by-side layout */}
      <div className="hidden md:flex w-full">
        <div className="w-80 shrink-0">
          <ConversationList
            selectedId={selectedConversation}
            onSelect={handleSelectConversation}
          />
        </div>
        <div className="flex-1">
          <ChatView conversationId={selectedConversation} />
        </div>
      </div>

      {/* Mobile: Full-screen switching */}
      <div className="md:hidden w-full">
        {showMobileChat && selectedConversation ? (
          <ChatView conversationId={selectedConversation} onBack={handleBack} />
        ) : (
          <ConversationList
            selectedId={selectedConversation}
            onSelect={handleSelectConversation}
          />
        )}
      </div>
    </div>
  );
}

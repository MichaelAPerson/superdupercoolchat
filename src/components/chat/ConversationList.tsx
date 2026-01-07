import { useState } from 'react';
import { useConversations, Conversation } from '@/hooks/useConversations';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import NewConversationDialog from './NewConversationDialog';

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const { data: conversations, isLoading } = useConversations();
  const [search, setSearch] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);

  const filteredConversations = conversations?.filter(conv => {
    const participantNames = conv.participants
      .map(p => p.username || p.email)
      .join(' ')
      .toLowerCase();
    return participantNames.includes(search.toLowerCase());
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="h-full flex flex-col bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-primary" />
            Chats
          </h1>
          <Button
            size="icon"
            variant="ghost"
            className="hover:bg-sidebar-accent"
            onClick={() => setShowNewDialog(true)}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-sidebar-accent border-0 focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1 chat-scrollbar">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent/50 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-3 w-32 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations?.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No conversations yet</p>
            <Button
              variant="link"
              className="text-primary"
              onClick={() => setShowNewDialog(true)}
            >
              Start a new chat
            </Button>
          </div>
        ) : (
          <div className="p-2">
            {filteredConversations?.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isSelected={selectedId === conv.id}
                onClick={() => onSelect(conv.id)}
                getInitials={getInitials}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      <NewConversationDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        onConversationCreated={(id) => {
          onSelect(id);
          setShowNewDialog(false);
        }}
      />
    </div>
  );
}

function ConversationItem({
  conversation,
  isSelected,
  onClick,
  getInitials,
}: {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
  getInitials: (name: string) => string;
}) {
  const participant = conversation.participants[0];
  const displayName = participant?.username || participant?.email || 'Unknown';

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
        isSelected
          ? 'bg-primary/20 border border-primary/30'
          : 'hover:bg-sidebar-accent'
      }`}
    >
      <Avatar className="w-12 h-12">
        <AvatarImage src={participant?.avatar_url || undefined} />
        <AvatarFallback className="bg-primary/20 text-primary">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between">
          <span className="font-medium truncate">{displayName}</span>
          {conversation.last_message && (
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(conversation.last_message.created_at), { addSuffix: false })}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {conversation.last_message?.content || (conversation.last_message?.image_url ? '📷 Image' : 'No messages yet')}
        </p>
      </div>
    </button>
  );
}

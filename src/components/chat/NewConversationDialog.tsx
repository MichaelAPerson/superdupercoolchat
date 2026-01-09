import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2 } from 'lucide-react';
import { useUsers, UserProfile } from '@/hooks/useUsers';
import { useCreateConversation } from '@/hooks/useConversations';
import { toast } from 'sonner';

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: (id: string) => void;
}

export default function NewConversationDialog({
  open,
  onOpenChange,
  onConversationCreated,
}: NewConversationDialogProps) {
  const [search, setSearch] = useState('');
  const { data: users, isLoading } = useUsers(search);
  const createConversation = useCreateConversation();

  const handleSelectUser = async (user: UserProfile) => {
    try {
      const conversationId = await createConversation.mutateAsync(user.id);
      toast.success(`Started conversation with ${user.username || user.email}`);
      onConversationCreated(conversationId);
    } catch (error: unknown) {
      // Useful for debugging in development; avoid logging sensitive info.
      console.error('Failed to create conversation', error);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error && 'message' in error
            ? String((error as any).message)
            : 'Failed to create conversation';
      toast.error(message);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect border-border/30 max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users by email or username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-input border-border/50"
            />
          </div>

          <ScrollArea className="h-64">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : users?.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {search ? 'No users found' : 'Start typing to search users'}
              </div>
            ) : (
              <div className="space-y-2">
                {users?.map((user) => (
                  <Button
                    key={user.id}
                    variant="ghost"
                    className="w-full justify-start gap-3 h-auto py-3 hover:bg-accent"
                    onClick={() => handleSelectUser(user)}
                    disabled={createConversation.isPending}
                  >
                    <Avatar>
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {getInitials(user.username || user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <div className="font-medium">
                        {user.username || user.email.split('@')[0]}
                      </div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

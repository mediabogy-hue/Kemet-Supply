
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import {
  collection,
  query,
  where,
  addDoc,
  serverTimestamp,
  orderBy,
  doc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import type { Conversation, Message, UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Send, Users, MessageSquare } from 'lucide-react';
import { useSession } from '@/auth/SessionProvider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { RefreshIndicator } from '@/components/ui/skeleton';


export default function MessagesPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  const conversationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'conversations'),
      where('participantIds', 'array-contains', user.uid)
    );
  }, [firestore, user]);
  const { data: conversations, isLoading: conversationsLoading, setData: setConversations, lastUpdated } = useCollection<Conversation>(conversationsQuery);

  const sortedConversations = useMemo(() => {
    if (!conversations) return null;
    return [...conversations].sort((a, b) => (b.lastMessageTimestamp?.toDate?.()?.getTime() || 0) - (a.lastMessageTimestamp?.toDate?.()?.getTime() || 0));
  }, [conversations]);

  useEffect(() => {
    if (!selectedConversation && sortedConversations && sortedConversations.length > 0) {
      setSelectedConversation(sortedConversations[0]);
    }
  }, [sortedConversations, selectedConversation]);

  const handleNewConversation = (newConv: Conversation) => {
    const convExists = conversations?.some(c => c.id === newConv.id);
    if (!convExists) {
        setConversations(prev => (prev ? [newConv, ...prev] : [newConv]));
    }
    setSelectedConversation(newConv);
  }

  return (
    <div className="h-[calc(100vh_-_10rem)]">
      <Card className="h-full grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 border-border/60">
        <ConversationList
          conversations={sortedConversations}
          isLoading={conversationsLoading}
          selectedConversation={selectedConversation}
          onSelectConversation={setSelectedConversation}
          onNewConversation={handleNewConversation}
          lastUpdated={lastUpdated}
        />
        <ChatWindow
          conversation={selectedConversation}
        />
      </Card>
    </div>
  );
}

function ConversationList({ conversations, isLoading, selectedConversation, onSelectConversation, onNewConversation, lastUpdated }: { conversations: Conversation[] | null, isLoading: boolean, selectedConversation: Conversation | null, onSelectConversation: (c: Conversation) => void, onNewConversation: (c: Conversation) => void, lastUpdated: Date | null }) {
  const { user } = useUser();
  const otherParticipant = (conv: Conversation) => {
    const otherId = conv.participantIds.find((id) => id !== user?.uid);
    return conv.participantDetails[otherId || ''];
  };

  return (
    <div className="col-span-1 flex h-full flex-col border-e border-border/60">
      <CardHeader className="flex flex-row items-center justify-between p-4">
        <div className="space-y-1">
            <CardTitle className="text-xl">الرسائل</CardTitle>
            <RefreshIndicator isLoading={isLoading} lastUpdated={lastUpdated} />
        </div>
        <NewConversationDialog onNewConversation={onNewConversation} conversations={conversations}/>
      </CardHeader>
      <ScrollArea className="flex-1">
        {isLoading && <p className="p-4 text-sm text-muted-foreground">جاري تحميل المحادثات...</p>}
        {!isLoading &&
          conversations?.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv)}
              className={cn(
                'flex w-full items-center gap-3 p-4 text-start transition-colors hover:bg-accent/50',
                selectedConversation?.id === conv.id && 'bg-accent'
              )}
            >
              <Avatar className="h-12 w-12 border-2 border-border">
                <AvatarFallback>{otherParticipant(conv)?.name?.substring(0, 2) || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 truncate">
                <p className="font-semibold">{otherParticipant(conv)?.name}</p>
                <p className="truncate text-sm text-muted-foreground">{conv.lastMessageText}</p>
              </div>
            </button>
          ))}
           {!isLoading && conversations?.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
                <MessageSquare className="mx-auto h-12 w-12" />
                <p className="mt-4">لا توجد محادثات بعد.</p>
            </div>
           )}
      </ScrollArea>
    </div>
  );
}

function ChatWindow({ conversation }: { conversation: Conversation | null }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !conversation) return null;
    return query(collection(firestore, `conversations/${conversation.id}/messages`), orderBy('createdAt', 'asc'));
  }, [firestore, conversation]);

  const { data: messages, isLoading: messagesLoading } = useCollection<Message>(messagesQuery);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user || !conversation || !newMessage.trim()) return;

    const text = newMessage.trim();
    setNewMessage('');

    const messagesColRef = collection(firestore, `conversations/${conversation.id}/messages`);
    const conversationDocRef = doc(firestore, 'conversations', conversation.id);

    const batch = writeBatch(firestore);
    
    const messageDocRef = doc(messagesColRef);
    const messageData = {
      id: messageDocRef.id,
      conversationId: conversation.id,
      senderId: user.uid,
      text: text,
      createdAt: serverTimestamp(),
    };
    batch.set(messageDocRef, messageData);

    const conversationUpdateData = {
      lastMessageText: text,
      lastMessageTimestamp: serverTimestamp(),
      lastMessageSenderId: user.uid,
    };
    batch.update(conversationDocRef, conversationUpdateData);

    batch.commit().catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `batch write to conversations/${conversation.id}`,
            operation: 'write',
            requestResourceData: { message: messageData, conversationUpdate: conversationUpdateData }
        }));
    });
  };
  
   useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector<HTMLDivElement>('div[data-radix-scroll-area-viewport]');
        if(viewport) {
             viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);


  if (!conversation) {
    return (
      <div className="col-span-1 md:col-span-2 lg:col-span-3 flex h-full items-center justify-center bg-background">
        <div className="text-center">
            <MessageSquare className="mx-auto h-16 w-16 text-muted-foreground/50"/>
          <p className="text-lg font-semibold mt-4">اختر محادثة</p>
          <p className="text-muted-foreground">أو ابدأ محادثة جديدة لعرض الرسائل.</p>
        </div>
      </div>
    );
  }

  const otherParticipant = conversation.participantDetails[conversation.participantIds.find(id => id !== user?.uid) || ''];

  return (
    <div className="col-span-1 flex h-full flex-col md:col-span-2 lg:col-span-3">
      <div className="flex items-center gap-4 border-b border-border/60 p-4">
        <Avatar className="h-12 w-12 border-2 border-border">
            <AvatarFallback>{otherParticipant?.name?.substring(0, 2) || 'U'}</AvatarFallback>
        </Avatar>
        <div>
            <p className="font-semibold text-lg">{otherParticipant?.name}</p>
            <p className="text-sm text-muted-foreground">{otherParticipant?.role}</p>
        </div>
      </div>
      <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
        <div className="space-y-6">
          {messagesLoading && <p className="text-center text-muted-foreground">جاري تحميل الرسائل...</p>}
          {messages?.map((msg) => (
            <div
              key={msg.id}
              className={cn('flex items-end gap-3', msg.senderId === user?.uid ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-md rounded-lg px-4 py-3 text-base',
                  msg.senderId === user?.uid
                    ? 'rounded-br-none bg-primary text-primary-foreground'
                    : 'rounded-bl-none bg-muted'
                )}
              >
                <p>{msg.text}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="border-t border-border/60 p-4">
        <form onSubmit={handleSendMessage} className="flex items-center gap-4">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="اكتب رسالتك هنا..."
            className="flex-1 h-11 text-base"
            autoComplete="off"
          />
          <Button type="submit" size="icon" className="h-11 w-11" disabled={!newMessage.trim()}>
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function NewConversationDialog({ onNewConversation, conversations }: { onNewConversation: (c: Conversation) => void, conversations: Conversation[] | null }) {
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isAdmin, isOrdersManager, isFinanceManager, isProductManager, isLoading: isRoleLoading, profile: currentUserProfile } = useSession();
  const isStaff = isAdmin || isOrdersManager || isFinanceManager || isProductManager;

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || isRoleLoading) return null;
    // Only admins can list all users according to security rules
    if (!isAdmin) return null;
    return query(collection(firestore, 'users'));
  }, [firestore, isAdmin, isRoleLoading]);

  const { data: usersFromQuery, isLoading: usersLoading } = useCollection<UserProfile>(usersQuery);
  
  const usersToShow = useMemo(() => {
    if (!usersFromQuery || !user) return [];
    return usersFromQuery.filter(u => u.id !== user.uid);
  }, [usersFromQuery, user]);

  const handleCreateConversation = async () => {
    if (!firestore || !user || !selectedUserId || !usersFromQuery || !currentUserProfile) {
        toast({ variant: "destructive", title: "خطأ", description: "لا يمكن إنشاء المحادثة. بيانات المستخدم غير مكتملة." });
        return;
    }
    
    const existingConversation = conversations?.find(c => 
        c.participantIds.length === 2 &&
        c.participantIds.includes(user.uid) && 
        c.participantIds.includes(selectedUserId)
    );

    if (existingConversation) {
        onNewConversation(existingConversation);
        setOpen(false);
        return;
    }

    const selectedUserProfile = usersFromQuery.find(u => u.id === selectedUserId);

    if (!selectedUserProfile) {
        toast({ variant: "destructive", title: "خطأ", description: "المستخدم الذي تم اختياره غير موجود."});
        return;
    }

    const conversationRef = collection(firestore, 'conversations');
    const newConvData = {
      participantIds: [user.uid, selectedUserId],
      participantDetails: {
        [user.uid]: { name: `${currentUserProfile.firstName || ''} ${currentUserProfile.lastName || ''}`.trim(), role: currentUserProfile.role },
        [selectedUserId]: { name: `${selectedUserProfile.firstName || ''} ${selectedUserProfile.lastName || ''}`.trim(), role: selectedUserProfile.role },
      },
      createdAt: serverTimestamp(),
      lastMessageTimestamp: serverTimestamp(),
      lastMessageText: 'بدأت المحادثة',
    };

    addDoc(conversationRef, newConvData).then(newDocRef => {
        onNewConversation({id: newDocRef.id, ...newConvData} as Conversation);
        setOpen(false);
    }).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: conversationRef.path,
            operation: 'create',
            requestResourceData: newConvData,
        }));
        toast({ variant: "destructive", title: "خطأ", description: "لا يمكن إنشاء المحادثة. قد لا تملك الصلاحيات." });
    });
  }

  const isLoading = usersLoading || isRoleLoading;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Users className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>بدء محادثة جديدة</DialogTitle>
          <DialogDescription>اختر مستخدمًا لبدء محادثة معه.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-64 border-y">
             {isLoading && <p className="p-4 text-muted-foreground">جاري تحميل المستخدمين...</p>}
            {!isLoading && !isStaff && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                    <p>لا يمكنك بدء محادثات جديدة.</p>
                    <p className="mt-1">يمكن للموظفين بدء محادثة معك، وستظهر هنا.</p>
                </div>
            )}
            {!isLoading && isStaff && !isAdmin && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                    <p>ميزة البحث عن المستخدمين متاحة للأدمن فقط.</p>
                    <p className="mt-1">يمكنك الرد على المحادثات التي بدأها الآخرون معك.</p>
                </div>
            )}
            {!isLoading && isAdmin && usersToShow.length === 0 && <p className="p-4 text-muted-foreground">لا يوجد مستخدمين آخرين لعرضهم.</p>}
            {isAdmin && usersToShow.map(u => (
                <div key={u.id} 
                    onClick={() => setSelectedUserId(u.id)}
                    className={cn("flex items-center gap-3 p-3 cursor-pointer hover:bg-accent", selectedUserId === u.id && "bg-accent")}
                >
                    <Avatar className="h-10 w-10 border"><AvatarFallback>{u.firstName?.[0]}</AvatarFallback></Avatar>
                    <div>
                        <p className="font-semibold">{u.firstName} {u.lastName}</p>
                        <p className="text-sm text-muted-foreground">{u.role}</p>
                    </div>
                </div>
            ))}
        </ScrollArea>
        <Button onClick={handleCreateConversation} disabled={!selectedUserId || isLoading || !isAdmin}>
            {isLoading ? 'جاري التحميل...' : 'بدء المحادثة'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

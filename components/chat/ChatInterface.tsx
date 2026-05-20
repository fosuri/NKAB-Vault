"use client";

import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { ChevronLeft, Send, Paperclip, Trash2, X, Image as ImageIcon, Loader2 } from "lucide-react";
import {
  sendMessageAction,
  deleteMessageAction,
  deleteConversationAction
} from "@/lib/actions/chat";
import { MESSAGE_MEDIA_TYPES } from "@/lib/db/auth-schema";
import { getCloudinarySignature } from "@/lib/actions/cloudinary";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  mediaUrl: string | null;
  mediaTypeId: number | null;
  mediaPublicId: string | null;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
  sender?: {
    id: string;
    name: string;
    image: string | null;
  };
};

type ChatInterfaceProps = {
  conversationId: string;
  initialMessages: Message[];
  currentUserId: string;
  otherUser: {
    id: string;
    name: string;
    image: string | null;
  };
};

/**
 * Chat Interface Component.
 * Manages the real-time messaging flow between two users, including 
 * text messages, media attachments, and conversation management.
 */
export function ChatInterface({ conversationId, initialMessages, currentUserId, otherUser }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Scroll to the latest message automatically
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // Read Status Management: Marks messages as read when the component mounts or updates
  useEffect(() => {
    const markAsRead = async () => {
      const hasUnread = messages.some(m => !m.isRead && m.senderId !== currentUserId);
      if (hasUnread) {
        try {
          const { markConversationMessagesAsReadAction } = await import("@/lib/actions/chat");
          await markConversationMessagesAsReadAction(conversationId);
        } catch (e) {
          console.error("Failed to mark messages as read");
        }
      }
    };
    markAsRead();
  }, [conversationId, messages, currentUserId]);

  /**
   * Real-Time Synchronization:
   * Establishes a Server-Sent Events (SSE) connection to receive instant 
   * updates for new messages, deletions, and read receipts.
   */
  useEffect(() => {
    const eventSource = new EventSource(`/api/chat/stream?conversationId=${conversationId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "delete_message") {
          setMessages(prev => prev.filter(m => m.id !== data.messageId));
        } else if (data.type === "messages_read") {
          setMessages(prev => prev.map(m => 
            m.senderId !== data.readerId && !m.isRead ? { ...m, isRead: true } : m
          ));
        } else {
          // New Message Handling with duplicate prevention
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.id)) return prev;
            // Remove optimistic placeholder if it matches the incoming message
            const withoutTemp = prev.filter(m => !(m.id.startsWith('temp-') && m.senderId === data.senderId && m.content === data.content));
            return [...withoutTemp, data];
          });
        }
      } catch (error) {
        console.error("SSE Parse Error:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE connection lost, retrying...", error);
    };

    return () => {
      eventSource.close();
    };
  }, [conversationId]);

  // Sync state when initial props change (e.g., during navigation)
  useEffect(() => {
    if (
      initialMessages.length !== messages.length ||
      (initialMessages.length > 0 && messages.length > 0 && initialMessages[initialMessages.length - 1].id !== messages[messages.length - 1].id)
    ) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  // Handle local file selection with size limit validation
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 20 * 1024 * 1024) {
        toast.error("File must be less than 20MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  // Upload media directly to Cloudinary using signed requests
  const uploadToCloudinary = async (file: File) => {
    try {
      const { signature, timestamp, folder, apiKey, cloudName } = await getCloudinarySignature();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp.toString());
      formData.append("signature", signature);
      formData.append("folder", folder);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to upload");

      return {
        url: data.secure_url,
        publicId: data.public_id,
        resourceType: data.resource_type,
      };
    } catch (e) {
      console.error("Cloudinary Upload Error:", e);
      return null;
    }
  };

  /**
   * Message Submission:
   * Implements Optimistic UI — adds the message to the local list immediately 
   * while the server-side action processes in the background.
   */
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputValue.trim() && !selectedFile) || isSending) return;

    const content = inputValue.trim();
    setIsSending(true);

    let mediaData = null;
    if (selectedFile) {
      mediaData = await uploadToCloudinary(selectedFile);
      if (!mediaData) {
        toast.error("Failed to upload media");
        setIsSending(false);
        return;
      }
    }

    setInputValue("");
    setSelectedFile(null);

    // Optimistic placeholder
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId,
      senderId: currentUserId,
      content: content || null,
      mediaUrl: mediaData?.url || null,
      mediaTypeId: mediaData?.resourceType === "video" ? MESSAGE_MEDIA_TYPES.VIDEO : mediaData?.resourceType === "image" ? MESSAGE_MEDIA_TYPES.IMAGE : mediaData?.resourceType === "file" ? MESSAGE_MEDIA_TYPES.FILE : null,
      mediaPublicId: mediaData?.publicId || null,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      sender: {
        id: currentUserId,
        name: "You",
        image: null,
      }
    };

    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const result = await sendMessageAction(
        conversationId,
        content,
        mediaData?.url,
        mediaData?.resourceType,
        mediaData?.publicId
      );
      if (!result.success) {
        toast.error(result.error || "Failed to send message");
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      }
    } catch (error) {
      toast.error("An error occurred while sending");
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
    try {
      const result = await deleteMessageAction(messageId);
      if (!result.success) {
        toast.error(result.error || "Failed to delete message");
        router.refresh(); 
      }
    } catch {
      toast.error("Failed to delete message");
      router.refresh();
    }
  };

  const handleDeleteConversation = async () => {
    try {
      const result = await deleteConversationAction(conversationId);
      if (result.success) {
        toast.success("Conversation deleted");
        router.push("/chat");
      } else {
        toast.error(result.error || "Failed to delete conversation");
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Chat Header: User info and management options */}
      <div className="flex items-center justify-between p-2 sm:p-4 border-b border-border/50 bg-muted/20 shrink-0">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => router.push("/chat")}
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="sr-only">Back to conversations</span>
          </Button>
          <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
            {otherUser.image ? (
              <AvatarImage src={otherUser.image} alt={otherUser.name} />
            ) : null}
            <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <h2 className="font-semibold text-sm sm:text-base truncate">{otherUser.name}</h2>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full shrink-0">
              <span className="sr-only">Open menu</span>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4"><path d="M3.625 7.5C3.625 8.12132 3.11764 8.625 2.49632 8.625C1.875 8.625 1.36765 8.12132 1.36765 7.5C1.36765 6.87868 1.875 6.375 2.49632 6.375C3.11764 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.11764 8.625 7.49632 8.625C6.875 8.625 6.36765 8.12132 6.36765 7.5C6.36765 6.87868 6.875 6.375 7.49632 6.375C8.11764 6.375 8.625 6.87868 8.625 7.5ZM12.4963 8.625C13.1176 8.625 13.625 8.12132 13.625 7.5C13.625 6.87868 13.1176 6.375 12.4963 6.375C11.875 6.375 11.3676 6.87868 11.3676 7.5C11.3676 8.12132 11.875 8.625 12.4963 8.625Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
              <Trash2 className="mr-2 h-4 w-4 shrink-0" />
              <span className="truncate">Delete Chat</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Chat</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this entire conversation? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  handleDeleteConversation();
                }}
              >
                Delete Chat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Message List Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm italic">
            No messages yet. Send a message to start the conversation!
          </div>
        ) : (
          messages.map((message) => {
            const isCurrentUser = message.senderId === currentUserId;
            return (
              <div
                key={message.id}
                className={`flex flex-col max-w-[85%] sm:max-w-[75%] group ${isCurrentUser ? "self-end items-end" : "self-start items-start"}`}
              >
                <div className="flex items-center gap-2">
                  {isCurrentUser && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => handleDeleteMessage(message.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                  <div
                    className={`px-3 py-2 sm:px-4 sm:py-2 rounded-2xl ${isCurrentUser
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm"
                      }`}
                  >
                    {/* Media Display (Image/Video) */}
                    {message.mediaUrl && (
                      <div className="mb-2 max-w-[200px] sm:max-w-sm rounded-lg overflow-hidden">
                        {message.mediaTypeId === MESSAGE_MEDIA_TYPES.VIDEO ? (
                          <video src={message.mediaUrl} controls className="w-full h-auto object-cover" />
                        ) : (
                          <img src={message.mediaUrl} alt="Attachment" className="w-full h-auto object-cover" />
                        )}
                      </div>
                    )}
                    {/* Text Content */}
                    {message.content && <p className="break-words text-sm sm:text-base">{message.content}</p>}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 px-1" suppressHydrationWarning>
                  {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                </span>
              </div>
            );
          })
        )}
        {/* Loading Indicator for outgoing messages */}
        {isSending && (
          <div className="self-end items-end text-muted-foreground mt-1 flex items-center gap-1 text-xs px-2">
            Sending... <Loader2 className="h-3 w-3 animate-spin" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File Attachment Preview */}
      {selectedFile && (
        <div className="px-2 py-2 sm:px-4 bg-muted/30 border-t border-border/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-sm text-foreground max-w-[80%] truncate">
            <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{selectedFile.name}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full shrink-0" onClick={() => setSelectedFile(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Message Input Form */}
      <form
        onSubmit={handleSendMessage}
        className="p-2 sm:p-4 border-t border-border/50 bg-background flex items-center gap-1 sm:gap-2 shrink-0 mt-auto"
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*,video/*"
          onChange={handleFileSelect}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 sm:h-10 sm:w-10 rounded-full shrink-0 text-muted-foreground"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
        >
          <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="sr-only">Attach file</span>
        </Button>

        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 min-w-0 h-9 sm:h-10 rounded-full bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary text-sm"
          autoComplete="off"
          disabled={isSending}
        />
        <Button
          type="submit"
          size="icon"
          disabled={(!inputValue.trim() && !selectedFile) || isSending}
          className="h-9 w-9 sm:h-10 sm:w-10 rounded-full shrink-0"
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  );
}


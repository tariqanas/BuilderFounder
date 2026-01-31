"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import {
  getMessages,
  sendMessage,
  subscribeToMessages,
  supabase,
} from "@/lib/supabase";
import { playToastSound } from "@/lib/toast-sound";
import type { Message } from "@/types";

type ChatWindowProps = {
  matchId: string;
  currentUserId: string;
};

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

export default function ChatWindow({ matchId, currentUserId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadMessages = async () => {
      setIsLoading(true);
      try {
        const data = await getMessages(matchId);
        if (isMounted) {
          setMessages(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadMessages();

    return () => {
      isMounted = false;
    };
  }, [matchId]);

  useEffect(() => {
    const channel = subscribeToMessages(matchId, (message) => {
      if (message.user_id !== currentUserId) {
        toast({
          title: "Nouveau message",
          description: message.content.slice(0, 80),
        });
        playToastSound();
      }
      setMessages((prev) => {
        if (prev.some((item) => item.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    setIsSending(true);
    try {
      const newMessage = await sendMessage(matchId, input.trim());
      setInput("");
      setMessages((prev) => {
        if (prev.some((message) => message.id === newMessage.id)) {
          return prev;
        }
        return [...prev, newMessage];
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <ScrollArea className="h-[420px] rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={`chat-skeleton-${index}`}
                className={`flex ${index % 2 === 0 ? "justify-start" : "justify-end"}`}
              >
                <Skeleton className="h-12 w-2/3 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-slate-400">
            Aucun message pour le moment. Lance la discussion !
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const isMine = message.user_id === currentUserId;
              return (
                <div
                  key={message.id}
                  className={`flex ${
                    isMine ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                      isMine
                        ? "bg-emerald-400 text-slate-900"
                        : "bg-slate-800 text-slate-100"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        isMine ? "text-slate-800/70" : "text-slate-400"
                      }`}
                    >
                      {formatTime(message.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Écris ton message..."
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSend();
            }
          }}
        />
        <Button
          onClick={handleSend}
          disabled={isSending || !input.trim()}
          className="sm:w-32"
        >
          {isSending ? "Envoi..." : "Envoyer"}
        </Button>
      </div>
    </div>
  );
}

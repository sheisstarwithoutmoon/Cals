"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  BotIcon,
  CheckCircle2Icon,
  Loader2Icon,
  SendIcon,
  UserIcon,
  XIcon,
} from "lucide-react";

import { sendChatMessage, type ChatResponse } from "@/lib/api/ai";

interface MessageItem {
  id: string;
  sender: "user" | "assistant";
  text: string;
  action?: string;
  meal?: any;
  summary?: any;
}

const QUICK_PROMPTS = [
  "Log 2 eggs and coffee",
  "How many calories do I have left?",
  "Show my weekly summary",
  "Suggest high-protein snacks",
];

export function AiChatDrawer({
  isOpen,
  onClose,
  onMealLogged,
}: {
  isOpen: boolean;
  onClose: () => void;
  onMealLogged?: () => void;
}) {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Hi! You can ask me to log a meal, check your calories, view your nutrition summary, or ask a nutrition question.",
    },
  ]);

  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  async function handleSend(textToSend?: string) {
    const text = (textToSend || inputValue).trim();

    if (!text || isLoading) return;

    const userMessage: MessageItem = {
      id: `user - ${Date.now()} `,
      sender: "user",
      text,
    };

    setMessages((current) => [...current, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const history = messages.map((message) => ({
        role: message.sender,
        content: message.text,
      }));

      const response: ChatResponse = await sendChatMessage({
        message: text,
        history,
      });

      if (response.success) {
        const assistantMessage: MessageItem = {
          id: `assistant - ${Date.now()} `,
          sender: "assistant",
          text: response.reply,
          action: response.action,
          meal: response.meal,
          summary: response.summary,
        };

        setMessages((current) => [...current, assistantMessage]);

        if (response.action === "MEAL_LOGGED") {
          onMealLogged?.();
        }
      }
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: `error - ${Date.now()} `,
          sender: "assistant",
          text: "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    handleSend();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-stone-900/30 backdrop-blur-xs">
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-stone-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 bg-[#eef7f2] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-700 text-white">
              <BotIcon className="size-5" />
            </div>

            <div>
              <h2 className="font-heading text-base font-bold text-stone-900">
                Cals Assistant
              </h2>
              <p className="text-[11px] text-stone-500">
                Ask about your nutrition
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 transition-colors hover:bg-white hover:text-stone-700"
            aria-label="Close"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-[#eef7f2]/20 to-white p-4 sm:p-5">
          {messages.map((message) => {
            const isUser = message.sender === "user";

            return (
              <div
                key={message.id}
                className={`flex items - start gap - 2.5 ${isUser ? "flex-row-reverse" : ""
                  } `}
              >
                <div
                  className={`flex size - 7 shrink - 0 items - center justify - center rounded - full ${isUser
                    ? "bg-stone-900 text-white"
                    : "bg-emerald-100 text-emerald-800"
                    } `}
                >
                  {isUser ? (
                    <UserIcon className="size-3.5" />
                  ) : (
                    <BotIcon className="size-3.5" />
                  )}
                </div>

                <div className="max-w-[85%] space-y-2">
                  <div
                    className={`rounded - 2xl px - 4 py - 3 text - xs leading - relaxed sm: text - sm ${isUser
                      ? "rounded-tr-xs bg-stone-900 text-white"
                      : "rounded-tl-xs border border-emerald-100/60 bg-[#eaf4ee] text-stone-800"
                      } `}
                  >
                    {message.text}
                  </div>

                  {message.meal && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs">
                      <div className="flex items-center gap-1 font-bold text-emerald-900">
                        <CheckCircle2Icon className="size-3.5 text-emerald-700" />
                        <span>{message.meal.mealType}</span>
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[11px] text-emerald-800">
                        <span>{message.meal.foodName}</span>
                        <span className="font-bold">
                          {message.meal.calories} kcal
                        </span>
                      </div>
                    </div>
                  )}

                  {message.summary && (
                    <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-emerald-200 bg-white p-2.5 text-center">
                      <div className="rounded-lg bg-stone-50 p-1.5">
                        <p className="text-[10px] font-bold uppercase text-stone-500">
                          Meals
                        </p>
                        <p className="font-bold text-stone-900">
                          {message.summary.totalMealsLogged}
                        </p>
                      </div>

                      <div className="rounded-lg bg-stone-50 p-1.5">
                        <p className="text-[10px] font-bold uppercase text-stone-500">
                          Avg. calories
                        </p>
                        <p className="font-bold text-emerald-800">
                          {message.summary.avgDailyCalories} kcal/day
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 pl-10 text-xs text-stone-500">
              <Loader2Icon className="size-3.5 animate-spin text-emerald-700" />
              <span>Thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-stone-100 bg-stone-50 p-2.5">
          <p className="mb-1.5 px-1 text-[10px] font-bold uppercase text-stone-400">
            Suggestions
          </p>

          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleSend(prompt)}
                disabled={isLoading}
                className="cursor-pointer rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-stone-100 bg-white p-3">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Ask something or log a meal"
              disabled={isLoading}
              className="flex-1 rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-xs text-stone-900 outline-none placeholder:text-stone-400 focus:border-emerald-600 focus:bg-white sm:text-sm"
            />

            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-40"
              aria-label="Send message"
            >
              <SendIcon className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

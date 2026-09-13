"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  CheckCircle2Icon,
  FileTextIcon,
  Loader2Icon,
  MicIcon,
  PaperclipIcon,
  SendIcon,
  Squircle,
  SparklesIcon,
  UserIcon,
  XIcon,
} from "lucide-react";

import { ApiError } from "@/lib/api/client";
import { sendChatMessage, getChatHistory, type ChatResponse } from "@/lib/api/ai";
import { notifyDataChanged } from "@/lib/events";
import type { Goal, MealEntry } from "@/lib/types/api";

// Minimal shape of the (non-standard, vendor-prefixed) Web Speech API used
// for voice input — not part of TypeScript's DOM lib, so we declare only
// what this component actually touches instead of reaching for `any`.
interface SpeechRecognitionResult {
  0: { transcript: string };
}

interface SpeechRecognitionEvent {
  results: ArrayLike<SpeechRecognitionResult>;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface PendingFile {
  dataUrl: string;
  mimeType: string;
  name: string;
  kind: "IMAGE" | "PDF";
}

interface MessageItem {
  id: string;
  sender: "user" | "assistant";
  text: string;
  action?: ChatResponse["action"];
  meal?: MealEntry;
  goal?: Goal;
  summary?: ChatResponse["summary"];
  importedCount?: number;
  skippedCount?: number;
  attachment?: PendingFile;
}

const QUICK_PROMPTS = [
  "Log 2 eggs and coffee",
  "How many calories do I have left?",
  "Set my daily calorie goal to 2000",
  "Show my weekly summary",
];

function fileToPending(file: File): Promise<PendingFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        dataUrl: reader.result as string,
        mimeType: file.type,
        name: file.name,
        kind: file.type === "application/pdf" ? "PDF" : "IMAGE",
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AiChatDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Hi! Tell me what you ate, ask about your goals, or attach a food photo / PDF diary and I'll log it for you by text or voice.",
    },
  ]);

  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Grows the composer with its content instead of scrolling internally,
  // capped at MAX_TEXTAREA_HEIGHT so a long paste doesn't push the send
  // button and quick-prompt chips off screen.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const MAX_TEXTAREA_HEIGHT = 128;
    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  }, [inputValue]);

  // Loads once per mount (the drawer stays mounted behind the FAB, so this
  // also survives closing/reopening the panel) — otherwise every page
  // refresh would silently wipe the conversation since it only ever lived
  // in local React state.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await getChatHistory();
        if (cancelled || response.data.length === 0) return;

        setMessages(
          response.data.map((entry) => ({
            id: entry.id,
            sender: entry.sender,
            text: entry.text,
            action: entry.action,
            meal: entry.meal,
            goal: entry.goal,
            summary: entry.summary,
            importedCount: entry.importedCount,
            skippedCount: entry.skippedCount,
          }))
        );
      } catch {
        // Keep the default welcome message if history can't be loaded.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const windowWithSpeechRecognition = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SpeechRecognition =
      windowWithSpeechRecognition.SpeechRecognition ??
      windowWithSpeechRecognition.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    setVoiceSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ");
      setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onerror = (e) => {
      console.warn("Speech recognition error", e);
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function toggleRecording() {
    if (!recognitionRef.current) return;

    if (isRecording) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.warn("Could not start speech recognition", err);
        setIsRecording(false);
      }
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) return;

    const pending = await fileToPending(file);
    setPendingFile(pending);
  }

  async function handleSend(textToSend?: string) {
    const text = (textToSend ?? inputValue).trim();
    const file = pendingFile;

    if ((!text && !file) || isLoading) return;

    const userMessage: MessageItem = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: text || (file?.kind === "IMAGE" ? "Sent a photo" : "Sent a PDF"),
      attachment: file ?? undefined,
    };

    setMessages((current) => [...current, userMessage]);
    setInputValue("");
    setPendingFile(null);
    setIsLoading(true);

    try {
      const response = await sendChatMessage({
        message: text || (file?.kind === "IMAGE" ? "Log this meal from the photo" : "Import this PDF"),
        imageBase64: file?.kind === "IMAGE" ? file.dataUrl : undefined,
        imageMimeType: file?.kind === "IMAGE" ? file.mimeType : undefined,
        pdfBase64: file?.kind === "PDF" ? file.dataUrl : undefined,
      });

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          sender: "assistant",
          text: response.reply,
          action: response.action,
          meal: response.meal,
          goal: response.goal,
          summary: response.summary,
          importedCount: response.importedCount,
          skippedCount: response.skippedCount,
        },
      ]);

      if (
        response.action === "MEAL_LOGGED" ||
        response.action === "GOAL_UPDATED" ||
        response.action === "PDF_IMPORTED"
      ) {
        notifyDataChanged();
      }
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `error-${Date.now()}`,
          sender: "assistant",
          text:
            error instanceof ApiError
              ? error.message
              : "Something went wrong. Please try again.",
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

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop overlay: pure dark backdrop without glitchy backdrop-filter */}
      <div
        className="fixed inset-0 bg-black/40 transition-opacity duration-300 select-none animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div className="fixed inset-y-0 right-0 z-10 flex h-full w-full max-w-md flex-col border-l border-stone-200 bg-white shadow-2xl transition-transform duration-300 animate-in slide-in-from-right">
        <div className="flex items-center justify-between bg-linear-to-br from-emerald-700 to-emerald-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/20">
              <SparklesIcon className="size-5" />
            </div>

            <div className="min-w-0">
              <h2 className="font-heading text-base font-bold text-white">
                Ask Cals
              </h2>
              <p className="truncate text-[11px] text-emerald-50/80">
                Log meals, check goals, or ask nutrition questions
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-emerald-50/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-[#f7fbf8] p-4 sm:p-5">
          {messages.map((message) => {
            const isUser = message.sender === "user";

            return (
              <div
                key={message.id}
                className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                    isUser
                      ? "bg-stone-900 text-white"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {isUser ? (
                    <UserIcon className="size-3.5" />
                  ) : (
                    <SparklesIcon className="size-3.5" />
                  )}
                </div>

                <div className="max-w-[85%] min-w-0 space-y-2">
                  {message.attachment && (
                    <div
                      className={`overflow-hidden rounded-2xl border ${
                        isUser ? "border-stone-700" : "border-emerald-100"
                      }`}
                    >
                      {message.attachment.kind === "IMAGE" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={message.attachment.dataUrl}
                          alt="Uploaded"
                          className="max-h-40 w-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center gap-2 bg-stone-100 px-3 py-2 text-xs font-medium text-stone-700">
                          <FileTextIcon className="size-4 shrink-0" />
                          <span className="truncate">{message.attachment.name}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className={`rounded-2xl px-4 py-3 text-xs leading-relaxed break-words sm:text-sm ${
                      isUser
                        ? "rounded-tr-xs bg-stone-900 text-white"
                        : "rounded-tl-xs border border-emerald-100/60 bg-white text-stone-800 shadow-xs"
                    }`}
                  >
                    {message.text}
                  </div>

                  {message.meal && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs">
                      <div className="flex items-center gap-1 font-bold text-emerald-900">
                        <CheckCircle2Icon className="size-3.5 text-emerald-700" />
                        <span>{message.meal.mealType}</span>
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-emerald-800">
                        <span className="truncate">{message.meal.foodName}</span>
                        <span className="shrink-0 font-bold">
                          {message.meal.calories} kcal
                        </span>
                      </div>
                    </div>
                  )}

                  {message.action === "PDF_IMPORTED" && (
                    <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-emerald-200 bg-white p-2.5 text-center">
                      <div className="rounded-lg bg-stone-50 p-1.5">
                        <p className="text-[10px] font-bold uppercase text-stone-500">
                          Imported
                        </p>
                        <p className="font-bold text-emerald-800">
                          {message.importedCount ?? 0}
                        </p>
                      </div>
                      <div className="rounded-lg bg-stone-50 p-1.5">
                        <p className="text-[10px] font-bold uppercase text-stone-500">
                          Skipped
                        </p>
                        <p className="font-bold text-stone-900">
                          {message.skippedCount ?? 0}
                        </p>
                      </div>
                    </div>
                  )}

                  {message.goal && (
                    <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-emerald-200 bg-white p-2.5 text-center text-[11px]">
                      <div className="rounded-lg bg-stone-50 p-1.5">
                        <p className="font-bold uppercase text-stone-500">Cal</p>
                        <p className="font-bold text-stone-900">
                          {message.goal.dailyCalories ?? "-"}
                        </p>
                      </div>
                      <div className="rounded-lg bg-stone-50 p-1.5">
                        <p className="font-bold uppercase text-stone-500">Protein</p>
                        <p className="font-bold text-stone-900">
                          {message.goal.dailyProtein ?? "-"}
                        </p>
                      </div>
                      <div className="rounded-lg bg-stone-50 p-1.5">
                        <p className="font-bold uppercase text-stone-500">Carbs</p>
                        <p className="font-bold text-stone-900">
                          {message.goal.dailyCarbs ?? "-"}
                        </p>
                      </div>
                      <div className="rounded-lg bg-stone-50 p-1.5">
                        <p className="font-bold uppercase text-stone-500">Fat</p>
                        <p className="font-bold text-stone-900">
                          {message.goal.dailyFat ?? "-"}
                        </p>
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
          {pendingFile && (
            <div className="mb-2 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
              {pendingFile.kind === "IMAGE" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pendingFile.dataUrl}
                  alt="Attachment preview"
                  className="size-8 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <FileTextIcon className="size-5 shrink-0 text-emerald-700" />
              )}
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-emerald-900">
                {pendingFile.name}
              </span>
              <button
                type="button"
                onClick={() => setPendingFile(null)}
                className="shrink-0 rounded-full p-1 text-emerald-700 hover:bg-emerald-100"
                aria-label="Remove attachment"
              >
                <XIcon className="size-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-end gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              aria-label="Attach a photo or PDF"
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 disabled:opacity-40"
            >
              <PaperclipIcon className="size-4.5" />
            </button>

            {voiceSupported && (
              <button
                type="button"
                onClick={toggleRecording}
                disabled={isLoading}
                aria-label={isRecording ? "Stop recording" : "Speak your message"}
                className={`flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
                  isRecording
                    ? "bg-rose-100 text-rose-600"
                    : "text-stone-500 hover:bg-stone-100"
                }`}
              >
                {isRecording ? (
                  <Squircle className="size-4 fill-current" />
                ) : (
                  <MicIcon className="size-4.5" />
                )}
              </button>
            )}

            <textarea
              ref={textareaRef}
              rows={1}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder={isRecording ? "Listening..." : "Ask something or log a meal"}
              disabled={isLoading}
              className="max-h-32 flex-1 resize-none overflow-y-hidden rounded-3xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-xs leading-relaxed text-stone-900 outline-none placeholder:text-stone-400 focus:border-emerald-600 focus:bg-white sm:text-sm"
            />

            <button
              type="submit"
              disabled={isLoading || (!inputValue.trim() && !pendingFile)}
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-40"
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

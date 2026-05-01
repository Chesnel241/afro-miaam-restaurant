"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CHAT_TOPICS, answerFor, type ChatCta } from "@/data/chatbot";

type Sender = "bot" | "user";

type Message = {
  id: string;
  sender: Sender;
  text: string;
  cta?: ChatCta;
};

const STORAGE_KEY = "afro-miaam-chat-v1";

// Avatar : photo officielle uploadée dans /public, fallback sur le SVG brand.
const AVATAR_PRIMARY = "/923DCAED-BB80-435A-BE60-442EFAC52BD1.png";
const AVATAR_FALLBACK = "/chatbot-avatar.svg";

const INITIAL_MESSAGE: Message = {
  id: "welcome",
  sender: "bot",
  text:
    "Salut ! Je suis là pour répondre rapidement à vos questions sur Afro Miaam. Choisissez un sujet ou posez votre question.",
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [tooltip, setTooltip] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Hydrate persisted history
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Message[];
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // Persist history
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* ignore */
    }
  }, [messages, hydrated]);

  // Tease tooltip after 3s on first visit
  useEffect(() => {
    if (open) return;
    const t = window.setTimeout(() => setTooltip(true), 3000);
    const t2 = window.setTimeout(() => setTooltip(false), 9000);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, [open]);

  // Autoscroll to bottom on new messages
  useEffect(() => {
    if (!open) return;
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open, typing]);

  // Esc closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function pushUser(text: string) {
    setMessages((m) => [...m, { id: uid(), sender: "user", text }]);
  }

  function respondTo(text: string) {
    setTyping(true);
    window.setTimeout(() => {
      const { answer, cta } = answerFor(text);
      setMessages((m) => [
        ...m,
        { id: uid(), sender: "bot", text: answer, cta },
      ]);
      setTyping(false);
    }, 600);
  }

  function handlePickTopic(topicId: string) {
    const topic = CHAT_TOPICS.find((t) => t.id === topicId);
    if (!topic) return;
    pushUser(topic.label);
    respondTo(topic.label);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    pushUser(text);
    setInput("");
    respondTo(text);
  }

  return (
    <>
      {/* Bouton flottant : avatar + point vert + animation */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
        <div className="flex flex-col items-end gap-2">
          {tooltip && !open && (
            <div className="pointer-events-auto animate-floaty rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-primary shadow-soft">
              Bonjour&nbsp;! Une question&nbsp;?
            </div>
          )}

          <button
            type="button"
            aria-label={
              open ? "Fermer le chat" : "Ouvrir le chat avec Afro Miaam"
            }
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="pointer-events-auto group relative inline-flex h-16 w-16 items-center justify-center rounded-full bg-cream shadow-soft ring-2 ring-accent transition hover:scale-105 sm:h-20 sm:w-20"
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-accent/0 transition group-hover:bg-accent/10"
            />
            {open ? (
              <CloseIcon />
            ) : (
              <span className="block h-full w-full overflow-hidden rounded-full">
                {!imgFailed ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={AVATAR_PRIMARY}
                    alt="Assistant Afro Miaam"
                    onError={() => setImgFailed(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={AVATAR_FALLBACK}
                    alt="Assistant Afro Miaam"
                    className="h-full w-full object-cover"
                  />
                )}
              </span>
            )}

            {/* Point vert : présence en ligne */}
            {!open && (
              <span
                aria-hidden="true"
                className="absolute bottom-1 right-1 inline-flex h-4 w-4 sm:h-5 sm:w-5"
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-full w-full rounded-full border-2 border-cream bg-emerald-500" />
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Panneau de chat */}
      {open && (
        <div
          role="dialog"
          aria-label="Chat Afro Miaam"
          className="fixed inset-x-3 bottom-24 z-50 flex max-h-[78vh] flex-col overflow-hidden rounded-2xl bg-white shadow-soft sm:inset-auto sm:bottom-28 sm:right-6 sm:w-[380px]"
        >
          <header className="relative flex items-center gap-3 bg-primary-gradient bg-grain p-4 text-cream">
            <span className="relative inline-flex h-12 w-12 shrink-0 overflow-hidden rounded-full bg-cream ring-2 ring-accent">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgFailed ? AVATAR_FALLBACK : AVATAR_PRIMARY}
                onError={() => setImgFailed(true)}
                alt="Assistant Afro Miaam"
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-0 right-0 inline-flex h-3 w-3 rounded-full border-2 border-cream bg-emerald-500" />
            </span>
            <div className="flex-1 leading-tight">
              <p className="font-display text-base font-bold">Afro Miaam</p>
              <p className="text-xs text-cream/75">
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400 align-middle" />
                En ligne, réponse rapide
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-cream/10 text-cream transition hover:bg-cream/20"
            >
              <CloseIcon small />
            </button>
          </header>

          <div
            ref={scrollerRef}
            className="flex-1 space-y-3 overflow-y-auto bg-creamSoft p-4"
          >
            {messages.map((m) => (
              <Bubble key={m.id} message={m} />
            ))}
            {typing && (
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-sm text-primary/60 shadow-card sm:max-w-[80%]">
                <Dot /> <Dot delay="150ms" /> <Dot delay="300ms" />
              </div>
            )}
          </div>

          {/* Suggestions rapides */}
          <div className="border-t border-primary/10 bg-white px-3 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary/60">
              Sujets fréquents
            </p>
            <div className="-mx-1 flex gap-2 overflow-x-auto pb-2">
              {CHAT_TOPICS.slice(0, 6).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handlePickTopic(t.id)}
                  className="shrink-0 rounded-full border border-primary/15 bg-creamSoft px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-accent hover:bg-accent/10 hover:text-accent"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 bg-white p-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez votre question…"
              aria-label="Message"
              className="min-h-11 flex-1 rounded-full border border-primary/15 bg-creamSoft px-4 text-sm text-primary placeholder:text-primary/45 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Envoyer"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white transition hover:opacity-90 disabled:opacity-40"
            >
              <SendIcon />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function Bubble({ message }: { message: Message }) {
  const isBot = message.sender === "bot";
  return (
    <div className={`flex ${isBot ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-card sm:max-w-[80%] ${
          isBot
            ? "rounded-bl-sm bg-white text-primary"
            : "rounded-br-sm bg-primary text-cream"
        }`}
      >
        <p>{message.text}</p>
        {isBot && message.cta && (
          <Link
            href={message.cta.href}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent transition hover:bg-accent hover:text-white"
          >
            {message.cta.label} →
          </Link>
        )}
      </div>
    </div>
  );
}

function Dot({ delay = "0ms" }: { delay?: string }) {
  return (
    <span
      className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary/40"
      style={{ animationDelay: delay }}
    />
  );
}

function CloseIcon({ small = false }: { small?: boolean }) {
  const size = small ? 18 : 22;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}

import { useRef, useState } from "react";
import { useAskSeoEngine } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

export function AskModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const askMutation = useAskSeoEngine();

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setQuestion("");
      setAnswer(null);
      setErrorMsg(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setAnswer(null);
    setErrorMsg(null);

    askMutation.mutate(
      { data: { question: question.trim() } },
      {
        onSuccess: (res) => {
          setAnswer(res.answer || "No specific answer provided by the engine.");
        },
        onError: () => {
          setErrorMsg(
            "Failed to query the SEO engine. Please check connection and try again.",
          );
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="askModalContent max-w-2xl gap-0 overflow-hidden p-0"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <DialogHeader className="border-b border-[#e5e9f0] bg-[#fcfcfd] p-4 pr-14 text-left">
          <p className="mb-1 text-xs font-bold tracking-widest text-[#5f6d83]">
            COMMAND CENTER
          </p>
          <DialogTitle className="text-lg font-bold text-[#172033]">
            Ask SEO ENGINE
          </DialogTitle>
          <DialogDescription className="text-xs text-[#647087]">
            Read-only access. Actions must be approved via operational queues.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="relative">
            <label htmlFor="ask-seo-question" className="sr-only">
              Question for SEO Engine
            </label>
            <input
              ref={inputRef}
              id="ask-seo-question"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What are the top risks right now?"
              className="askModalInput w-full border-b-2 border-[#e5e9f0] bg-transparent p-4 pl-0 pr-24 text-lg text-[#172033] outline-none transition-colors focus:border-[#3c82f6]"
              disabled={askMutation.isPending}
              aria-describedby="ask-modal-help"
            />
            <button
              type="submit"
              className="askModalSubmit absolute right-0 top-1/2 -translate-y-1/2 rounded-md bg-[#172744] px-4 py-2 font-medium text-white transition-colors hover:bg-[#0c1730] disabled:opacity-50"
              disabled={askMutation.isPending || !question.trim()}
            >
              Ask
            </button>
          </form>

          <p id="ask-modal-help" className="sr-only">
            Enter a read-only question. The answer does not approve or execute
            any SEO action.
          </p>

          <div
            className="mt-8 min-h-[120px]"
            aria-live="polite"
            aria-atomic="true"
          >
            {askMutation.isPending ? (
              <div
                className="flex h-full flex-col items-center justify-center text-[#647087]"
                role="status"
              >
                <Loader2
                  className="mb-2 h-6 w-6 animate-spin text-[#3c82f6]"
                  aria-hidden="true"
                />
                <span className="text-sm font-medium">
                  Consulting intelligence...
                </span>
              </div>
            ) : errorMsg ? (
              <div
                className="rounded-md border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] p-4 text-sm font-medium text-[var(--status-danger-fg)]"
                role="alert"
              >
                {errorMsg}
              </div>
            ) : answer ? (
              <div
                className="prose prose-sm max-w-none text-[#455168]"
                role="status"
              >
                {answer.split("\n").map((line, i) => (
                  <p key={i} className="mb-2 last:mb-0">
                    {line}
                  </p>
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[#647087]">
                Awaiting your input.
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-[#e5e9f0] bg-[#f8fafc] p-3 text-right text-xs text-[#647087]">
          Press{" "}
          <kbd className="rounded border border-[#d7dde7] bg-white px-1 font-mono">
            Esc
          </kbd>{" "}
          to close
        </div>
      </DialogContent>
    </Dialog>
  );
}

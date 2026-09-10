import { useState, useEffect, useRef } from "react";
import { useAskSeoEngine } from "@workspace/api-client-react";
import { Loader2, X } from "lucide-react";

export function AskModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const askMutation = useAskSeoEngine();

  useEffect(() => {
    if (open) {
      setQuestion("");
      setAnswer(null);
      setErrorMsg(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onOpenChange]);

  if (!open) return null;

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
          setErrorMsg("Failed to query the SEO engine. Please check connection and try again.");
        },
      }
    );
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c1730]/60 backdrop-blur-sm" 
      onClick={() => onOpenChange(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ask-modal-title"
    >
      <div 
        className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-[#e5e9f0] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 text-[#77839a] hover:text-[#172033] transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="p-4 border-b border-[#e5e9f0] bg-[#fcfcfd]">
          <p className="text-xs font-bold tracking-widest text-[#76839a] mb-1">COMMAND CENTER</p>
          <h2 id="ask-modal-title" className="text-lg font-bold text-[#172033]">Ask SEO ENGINE</h2>
          <p className="text-xs text-[#77839a]">Read-only access. Actions must be approved via operational queues.</p>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleSubmit} className="relative">
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What are the top risks right now?"
              className="w-full text-lg p-4 pl-0 border-b-2 border-[#e5e9f0] focus:border-[#3c82f6] outline-none transition-colors bg-transparent text-[#172033]"
              disabled={askMutation.isPending}
            />
            <button 
              type="submit" 
              className="absolute right-0 top-1/2 -translate-y-1/2 bg-[#172744] hover:bg-[#0c1730] text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
              disabled={askMutation.isPending || !question.trim()}
            >
              Ask
            </button>
          </form>

          <div className="mt-8 min-h-[120px]">
            {askMutation.isPending ? (
              <div className="flex flex-col items-center justify-center h-full text-[#77839a]">
                <Loader2 className="w-6 h-6 animate-spin text-[#3c82f6] mb-2" />
                <span className="text-sm font-medium">Consulting intelligence...</span>
              </div>
            ) : errorMsg ? (
              <div className="p-4 bg-[#fff3dc] text-[#8d5c0d] rounded-md border border-[#f1d49b] text-sm font-medium">
                {errorMsg}
              </div>
            ) : answer ? (
              <div className="prose prose-sm max-w-none text-[#455168]">
                {answer.split("\n").map((line, i) => (
                  <p key={i} className="mb-2 last:mb-0">{line}</p>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-[#aab3c6] text-sm">
                Awaiting your input.
              </div>
            )}
          </div>
        </div>
        <div className="p-3 bg-[#f8fafc] border-t border-[#e5e9f0] text-right text-xs text-[#77839a]">
          Press <kbd className="font-mono bg-white border border-[#e5e9f0] px-1 rounded">Esc</kbd> to close
        </div>
      </div>
    </div>
  );
}

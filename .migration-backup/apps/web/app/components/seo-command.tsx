"use client";

import { useEffect, useState } from "react";

export function SeoCommand() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setAnswer("");
    try {
      const response = await fetch("/api/command", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const payload = await response.json() as { answer?: string };
      setAnswer(payload.answer ?? "No answer available.");
    } catch {
      setAnswer("SEO ENGINE could not query the operational database right now.");
    } finally {
      setLoading(false);
    }
  }

  return <>
    <button className="ask" type="button" onClick={() => setOpen(true)}>⌘ K &nbsp; Ask SEO ENGINE</button>
    {open ? <div className="commandBackdrop" role="presentation" onMouseDown={() => setOpen(false)}>
      <section className="commandPanel" role="dialog" aria-modal="true" aria-label="Ask SEO ENGINE" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sectionHead"><div><p className="eyebrow">READ-ONLY COMMAND</p><h2>Ask SEO ENGINE</h2></div><button type="button" className="linkButton" onClick={() => setOpen(false)}>Close</button></div>
        <form onSubmit={ask} className="commandForm">
          <input autoFocus value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="e.g. What needs approval?" />
          <button type="submit" disabled={loading}>{loading ? "Querying…" : "Ask"}</button>
        </form>
        <div className="commandExamples">Try: “top opportunities”, “what needs approval?”, “queries ranking 6–15”, or “why is data unavailable?”</div>
        {answer ? <div className="commandAnswer">{answer}</div> : null}
        <small className="muted">This interface is read-only and cannot publish or approve changes.</small>
      </section>
    </div> : null}
  </>;
}

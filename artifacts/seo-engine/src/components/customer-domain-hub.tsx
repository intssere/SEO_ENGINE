import { ArrowRight, Clock3 } from "lucide-react";
import { Link } from "wouter";
import { StatusBadge } from "./status-badge";

export type CustomerDomainCard = {
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
  status: "available" | "preview" | "unavailable" | "coming_soon";
};

const STATUS_META = {
  available: { label: "AVAILABLE", tone: "success" as const },
  preview: { label: "PREVIEW", tone: "info" as const },
  unavailable: { label: "NOT CONNECTED", tone: "neutral" as const },
  coming_soon: { label: "COMING NEXT", tone: "neutral" as const },
};

export function CustomerDomainHub({
  eyebrow,
  title,
  description,
  cards,
}: {
  eyebrow: string;
  title: string;
  description: string;
  cards: CustomerDomainCard[];
}) {
  return (
    <>
      <header className="topbar">
        <div>
          <strong>{title}</strong>
          <span className="muted"> Workspace</span>
        </div>
      </header>

      <div className="content customerHub">
        <section className="customerHubHero">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="muted">{description}</p>
        </section>

        <section
          className="customerHubGrid"
          aria-label={`${title} tools`}
        >
          {cards.map((card) => {
            const status = STATUS_META[card.status];
            return (
              <article className="card customerHubCard" key={card.title}>
                <div className="customerHubCardHead">
                  <h2>{card.title}</h2>
                  <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                </div>
                <p>{card.description}</p>

                {card.href ? (
                  <Link className="customerHubAction" href={card.href}>
                    {card.actionLabel ?? "Open"}
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <span className="customerHubPending">
                    <Clock3 className="w-4 h-4" aria-hidden="true" />
                    {card.actionLabel ?? "Not available yet"}
                  </span>
                )}
              </article>
            );
          })}
        </section>
      </div>
    </>
  );
}

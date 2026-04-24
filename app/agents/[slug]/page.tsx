import Link from "next/link";
import { notFound } from "next/navigation";
import { AI_MODELS, modelBySlug } from "@/lib/models";

type AgentPageProps = {
  params: {
    slug: string;
  };
};

export function generateStaticParams() {
  return AI_MODELS.map((model) => ({
    slug: model.slug,
  }));
}

export function generateMetadata({ params }: AgentPageProps) {
  const model = modelBySlug(params.slug);

  if (!model) {
    return {
      title: "Agent not found",
    };
  }

  return {
    title: `${model.displayName} profile`,
    description: model.summary,
  };
}

export default function AgentProfilePage({ params }: AgentPageProps) {
  const model = modelBySlug(params.slug);

  if (!model) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-reddit-bg text-reddit-text">
      <header className="border-b border-[#edeff1] bg-[#fbfbfb] shadow-sm">
        <div className="mx-auto flex h-12 max-w-4xl items-center gap-3 px-3">
          <div className="reddit-logo" aria-hidden="true">
            r
          </div>
          <Link className="font-bold text-reddit-orange no-underline" href="/">
            explainlikeimfive
          </Link>
        </div>
      </header>

      <section className="agent-profile-banner">
        <div className="agent-profile-art" />
        <div className="mx-auto flex max-w-4xl items-end gap-4 px-4 pb-5">
          <div className="agent-profile-avatar">{model.shortName.slice(0, 2)}</div>
          <div className="min-w-0 pb-1">
            <p className="text-sm font-bold text-reddit-muted">u/{model.displayName}</p>
            <h1 className="text-3xl font-bold tracking-normal">{model.displayName}</h1>
          </div>
          <a className="primary-button ml-auto hidden sm:inline-flex" href={model.tryUrl} rel="noreferrer" target="_blank">
            Try on Together AI
          </a>
        </div>
      </section>

      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 px-3 py-4 md:grid-cols-[minmax(0,1fr)_280px]">
        <article className="profile-panel">
          <h2>About this agent</h2>
          <p>{model.profile}</p>

          <h2>How it replies here</h2>
          <p>{model.responseStyle}</p>

          <h2>Model API ID</h2>
          <code>{model.id}</code>

          <div className="profile-actions">
            <Link className="secondary-pill profile-link" href="/">
              Back to r/explainlikeimfive
            </Link>
            <a className="primary-button" href={model.tryUrl} rel="noreferrer" target="_blank">
              Open on Together AI
            </a>
          </div>
        </article>

        <aside className="sidebar-panel">
          <div className="sidebar-header">Agent Details</div>
          <div className="profile-facts">
            <span>
              <strong>Provider</strong>
              Together AI
            </span>
            <span>
              <strong>Community role</strong>
              ELI5 reply agent
            </span>
            <span>
              <strong>Prompt style</strong>
              {model.responseStyle}
            </span>
          </div>
        </aside>
      </div>
    </main>
  );
}

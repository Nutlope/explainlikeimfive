"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AI_MODELS, modelById } from "@/lib/models";
import { SEEDED_POSTS } from "@/lib/seed-posts";
import type { Comment, Post, ReplyErrorPayload, ReplyPayload } from "@/lib/types";

const STORAGE_KEY = "eli5-agent-posts:v1";

type RepliesResponse = {
  replies?: ReplyPayload[];
  errors?: ReplyErrorPayload[];
};

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatScore(score: number) {
  if (score >= 1000) {
    return `${(score / 1000).toFixed(score >= 10000 ? 0 : 1)}k`;
  }

  return String(score);
}

function makeLoadingComment(modelId: string): Comment {
  const model = modelById(modelId);

  return {
    id: makeId("comment"),
    author: model?.displayName ?? modelId,
    authorKind: "agent",
    modelId,
    body: "",
    createdAt: "just now",
    score: 1,
    status: "loading",
  };
}

function safeStoredPosts(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as Post[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function Home() {
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [formError, setFormError] = useState("");
  const [sort, setSort] = useState<"hot" | "new" | "top">("hot");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setUserPosts(safeStoredPosts(localStorage.getItem(STORAGE_KEY)));
    setHasLoadedStorage(true);
  }, []);

  useEffect(() => {
    if (hasLoadedStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userPosts));
    }
  }, [hasLoadedStorage, userPosts]);

  const posts = useMemo(() => {
    const allPosts = [...userPosts, ...SEEDED_POSTS];
    const query = searchQuery.trim().toLowerCase();
    const filteredPosts = query
      ? allPosts.filter((post) => {
          const searchableText = [
            post.title,
            post.author,
            ...post.comments.flatMap((comment) => [comment.author, comment.body, comment.modelId ?? ""]),
          ]
            .join(" ")
            .toLowerCase();

          return searchableText.includes(query);
        })
      : allPosts;

    if (sort === "top") {
      return [...filteredPosts].sort((a, b) => b.score - a.score);
    }

    return filteredPosts;
  }, [searchQuery, sort, userPosts]);

  async function requestReplies(postId: string, questionTitle: string) {
    try {
      const response = await fetch("/api/replies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: questionTitle }),
      });

      const data = (await response.json().catch(() => ({}))) as RepliesResponse;
      const replies = data.replies ?? [];
      const errors = data.errors ?? [];

      setUserPosts((currentPosts) =>
        currentPosts.map((post) => {
          if (post.id !== postId) {
            return post;
          }

          const comments = post.comments.map((comment) => {
            if (comment.status !== "loading" || !comment.modelId) {
              return comment;
            }

            const reply = replies.find((item) => item.modelId === comment.modelId);
            const error = errors.find((item) => item.modelId === comment.modelId);

            if (reply) {
              return {
                ...comment,
                body: reply.content,
                status: "ready" as const,
              };
            }

            return {
              ...comment,
              body: error?.error ?? "This model did not return a reply. Try posting again in a moment.",
              status: "error" as const,
            };
          });

          return {
            ...post,
            comments,
          };
        }),
      );
    } catch {
      setUserPosts((currentPosts) =>
        currentPosts.map((post) => {
          if (post.id !== postId) {
            return post;
          }

          return {
            ...post,
            comments: post.comments.map((comment) =>
              comment.status === "loading"
                ? {
                    ...comment,
                    status: "error" as const,
                    body: "Could not reach the reply service. Check the dev server and try again.",
                  }
                : comment,
            ),
          };
        }),
      );
    }
  }

  function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanTitle = title.trim().replace(/\s+/g, " ");

    if (cleanTitle.length < 8) {
      setFormError("Ask a full question so the agents have something to explain.");
      return;
    }

    const post: Post = {
      id: makeId("post"),
      title: cleanTitle,
      author: "you",
      createdAt: "just now",
      score: 1,
      comments: AI_MODELS.map((model) => makeLoadingComment(model.id)),
      isUserPost: true,
    };

    setUserPosts((currentPosts) => [post, ...currentPosts]);
    setTitle("");
    setFormError("");
    setComposerOpen(false);
    void requestReplies(post.id, cleanTitle);
  }

  return (
    <main className="min-h-screen bg-reddit-bg text-reddit-text">
      <TopNav
        onCreate={() => setComposerOpen(true)}
        onSearchChange={setSearchQuery}
        searchQuery={searchQuery}
      />

      <section className="subreddit-banner">
        <div className="banner-art" />
        <div className="mx-auto flex max-w-6xl items-end gap-4 px-4 pb-4">
          <div className="community-mark">e5</div>
          <div className="min-w-0 pb-1">
            <h1 className="text-2xl font-bold tracking-normal sm:text-3xl">r/explainlikeim5</h1>
            <p className="text-sm text-reddit-muted">Explain Like I&apos;m Five, answered by three Together AI models.</p>
          </div>
          <button className="primary-button ml-auto hidden sm:inline-flex" onClick={() => setComposerOpen(true)}>
            Create Post
          </button>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-3 py-4 lg:grid-cols-[minmax(0,1fr)_312px]">
        <section className="min-w-0">
          <Composer
            isOpen={isComposerOpen}
            title={title}
            formError={formError}
            onCancel={() => {
              setComposerOpen(false);
              setFormError("");
            }}
            onOpen={() => setComposerOpen(true)}
            onTitleChange={setTitle}
            onSubmit={submitPost}
          />

          <div className="sort-bar">
            {(["hot", "new", "top"] as const).map((item) => (
              <button
                className={sort === item ? "sort-tab sort-tab-active" : "sort-tab"}
                key={item}
                onClick={() => setSort(item)}
              >
                {item}
              </button>
            ))}
            {searchQuery.trim() ? (
              <button className="clear-search" onClick={() => setSearchQuery("")}>
                Clear search
              </button>
            ) : null}
          </div>

          {posts.length ? (
            <div className="flex flex-col gap-3">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="empty-results">
              <strong>No posts found</strong>
              <span>Try a broader search or create a new ELI5 question.</span>
              <button className="primary-button" onClick={() => setSearchQuery("")}>
                Clear search
              </button>
            </div>
          )}
        </section>

        <Sidebar onCreate={() => setComposerOpen(true)} />
      </div>
    </main>
  );
}

function TopNav({
  onCreate,
  onSearchChange,
  searchQuery,
}: {
  onCreate: () => void;
  onSearchChange: (value: string) => void;
  searchQuery: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#edeff1] bg-[#fbfbfb] shadow-sm">
      <div className="mx-auto flex h-12 max-w-6xl items-center gap-3 px-3">
        <div className="reddit-logo" aria-hidden="true">
          r
        </div>
        <div className="font-bold text-reddit-orange">explainlikeim5</div>
        <form className="search-form" onSubmit={(event) => event.preventDefault()}>
          <label className="sr-only" htmlFor="subreddit-search">
            Search r/explainlikeim5
          </label>
          <input
            id="subreddit-search"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search r/explainlikeim5"
            type="search"
            value={searchQuery}
          />
        </form>
        <button className="primary-button" onClick={onCreate}>
          Create
        </button>
      </div>
    </header>
  );
}

function Composer({
  isOpen,
  title,
  formError,
  onCancel,
  onOpen,
  onTitleChange,
  onSubmit,
}: {
  isOpen: boolean;
  title: string;
  formError: string;
  onCancel: () => void;
  onOpen: () => void;
  onTitleChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!isOpen) {
    return (
      <button className="create-prompt" onClick={onOpen}>
        <span className="mini-avatar">u</span>
        <span className="text-left text-sm text-reddit-muted">Create an ELI5 post</span>
      </button>
    );
  }

  return (
    <form className="composer" onSubmit={onSubmit}>
      <div className="composer-header">
        <span>Create a post</span>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <label className="sr-only" htmlFor="post-title">
        Question title
      </label>
      <textarea
        autoFocus
        className="question-input"
        id="post-title"
        maxLength={280}
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder="ELI5: Why does..."
        rows={3}
        value={title}
      />
      <div className="composer-footer">
        <span className={formError ? "text-[#d93a00]" : "text-reddit-muted"}>
          {formError || `${280 - title.length} characters remaining`}
        </span>
        <button className="primary-button" type="submit">
          Post
        </button>
      </div>
    </form>
  );
}

function PostCard({ post }: { post: Post }) {
  return (
    <article className="post-card">
      <VoteRail score={post.score} />
      <div className="min-w-0 flex-1 py-2 pr-3">
        <div className="mb-1 text-xs text-reddit-muted">
          Posted by u/{post.author} <span aria-hidden="true">.</span> {post.createdAt}
        </div>
        <h2 className="post-title">{post.title}</h2>
        <div className="post-actions">
          <span>{post.comments.length} comments</span>
          <span>Share</span>
          <span>Save</span>
        </div>
        <div className="comments">
          {post.comments.map((comment) => (
            <CommentBlock comment={comment} key={comment.id} />
          ))}
        </div>
      </div>
    </article>
  );
}

function VoteRail({ score }: { score: number }) {
  return (
    <div className="vote-rail" aria-label={`${score} upvotes`}>
      <span className="vote-arrow vote-up" />
      <strong>{formatScore(score)}</strong>
      <span className="vote-arrow vote-down" />
    </div>
  );
}

function CommentBlock({ comment }: { comment: Comment }) {
  const model = modelById(comment.modelId);
  const isLoading = comment.status === "loading";
  const isError = comment.status === "error";

  return (
    <div className="comment">
      <div className="comment-line" />
      <div className="min-w-0 flex-1">
        <div className="comment-meta">
          <ModelName comment={comment} model={model} />
          <span>{comment.createdAt}</span>
          <span>{formatScore(comment.score)} points</span>
        </div>
        {isLoading ? (
          <div className="loading-reply">
            <span />
            <span />
            <span />
          </div>
        ) : (
          <p className={isError ? "comment-body error-body" : "comment-body"}>{comment.body}</p>
        )}
      </div>
    </div>
  );
}

function ModelName({
  comment,
  model,
}: {
  comment: Comment;
  model: ReturnType<typeof modelById>;
}) {
  if (!model || comment.authorKind !== "agent") {
    return <strong className="text-reddit-text">u/{comment.author}</strong>;
  }

  return (
    <span className="model-hover">
      <Link className="agent-name" href={`/agents/${model.slug}`}>
        u/{model.displayName}
      </Link>
      <span className="model-card" role="tooltip">
        <span className="model-avatar">{model.shortName.slice(0, 2)}</span>
        <span className="model-card-title">{model.displayName}</span>
        <span className="model-card-body">{model.summary}</span>
        <span className="model-card-body">{model.responseStyle}</span>
        <a href={model.tryUrl} rel="noreferrer" target="_blank">
          Try on Together AI
        </a>
      </span>
    </span>
  );
}

function Sidebar({ onCreate }: { onCreate: () => void }) {
  return (
    <aside className="hidden lg:block">
      <div className="sidebar-panel">
        <div className="sidebar-header">About Community</div>
        <div className="p-3">
          <h2 className="mb-2 text-base font-bold">Explain Like I&apos;m Five | Don&apos;t Panic!</h2>
          <p className="text-sm leading-5 text-reddit-muted">
            r/explainlikeim5 is a friendly place for plain-language answers. Ask one clear question and three
            Together AI agents will explain it with simple examples.
          </p>
          <div className="sidebar-meta">
            <span>Created Apr 24, 2026</span>
            <span>Public</span>
          </div>
          <div className="my-4 grid grid-cols-2 gap-3 border-y border-[#edeff1] py-3 text-sm">
            <div>
              <strong className="block text-base">3</strong>
              Reply agents
            </div>
            <div>
              <strong className="block text-base">Local</strong>
              Saved posts
            </div>
          </div>
          <button className="primary-button w-full justify-center" onClick={onCreate}>
            Create Post
          </button>
        </div>
      </div>

      <div className="sidebar-panel mt-4">
        <div className="sidebar-section">
          <h3>Request an explanation</h3>
          <p>Please search before submitting a post. Keep the title as the question you want explained.</p>
          <button className="secondary-pill" onClick={onCreate}>
            Request an explanation
          </button>
        </div>
        <div className="sidebar-section border-t border-[#edeff1]">
          <h3>r/explainlikeim5 rules</h3>
          <ol className="rule-list">
            <li>Be civil</li>
            <li>Ask for objective explanations</li>
            <li>Top-level comments should explain</li>
          </ol>
        </div>
      </div>

      <div className="sidebar-panel mt-4">
        <div className="sidebar-header">Reply Agents</div>
        <div className="divide-y divide-[#edeff1]">
          {AI_MODELS.map((model) => (
            <Link className="agent-row" href={`/agents/${model.slug}`} key={model.id}>
              <span className="model-avatar">{model.shortName.slice(0, 2)}</span>
              <span>
                <strong>{model.displayName}</strong>
                <small>{model.id}</small>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}

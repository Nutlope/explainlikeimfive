# Agent Instructions

This repo is a small Next.js App Router prototype for a Reddit-inspired ELI5 multi-agent app.

## Stack

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS plus custom CSS in `app/globals.css`
- Together AI via server-side `fetch` in `app/api/replies/route.ts`
- Exa web search via server-side `fetch` for GLM-5.1 only

## Commands

Run these before handing off meaningful changes:

```bash
npm run typecheck
npm run lint
npm run build
```

If `typecheck` fails because `.next/types/...` is missing while `next build` is running, rerun `npm run typecheck` after the build finishes.

## Important Files

- `app/page.tsx`: main feed, composer, search, localStorage, and progressive reply updates.
- `app/api/replies/route.ts`: Together AI prompt, GLM Exa tool loop, model calls, retry behavior, and response shaping.
- `app/agents/[slug]/page.tsx`: model profile pages.
- `lib/models.ts`: source of truth for model IDs, display names, slugs, profile copy, and Together links.
- `lib/seed-posts.ts`: seeded feed content.
- `lib/types.ts`: shared data types.
- `app/globals.css`: most UI styling.

## Product Behavior

- The UI should stay inspired by Reddit and `r/explainlikeimfive`, but it should not pretend to be Reddit.
- Users create posts with a question title only.
- User-created posts and AI replies persist in browser `localStorage`.
- The client sends one `/api/replies` request per model. Keep this progressive behavior so each response appears as soon as its model finishes.
- The server route accepts optional `modelId`; if omitted, it supports asking all configured models.
- Agent names should link to local profile pages, not directly to Together. Profile pages contain the Together links.

## Prompt And Model Rules

- Keep the shared ELI5 examples in the server prompt unless replacing them with clearly better examples.
- Preserve the per-model style split:
  - GLM-5.1 replies in lowercase.
  - Kimi K2.6 replies in one short paragraph.
  - MiniMax M2.5 replies normally.
- The prompt must tell models to never use em-dashes.
- Keep the server-side `removeEmDashes` cleanup so the app enforces that rule even if a model ignores it.
- Keep `reasoning: { enabled: false }` for Together requests unless there is a strong reason to change it. It helps avoid reasoning-only responses with no final content.
- GLM-5.1 has a `web_search` tool backed by Exa. Keep this server-side and only invoke it for GLM unless the product requirement changes.

## Environment And Secrets

- `TOGETHER_API_KEY` is required for real replies.
- `EXA_API_KEY` is required for GLM-5.1 web search.
- Store secrets in `.env.local`.
- Never expose `TOGETHER_API_KEY` or `EXA_API_KEY` to client components or `NEXT_PUBLIC_*` variables.

## UI Guidance

- Keep the palette calm and readable. Avoid bringing back saturated Reddit-orange as a dominant color.
- Use the existing CSS classes and app structure before adding new abstractions.
- Avoid nested cards and decorative clutter.
- Make controls keyboard-accessible. The post textarea submits on Enter and inserts a newline with Shift+Enter.

## Editing Notes

- Use TypeScript types from `lib/types.ts`.
- Keep `lib/models.ts` as the model metadata source of truth.
- When adding a new model, update `AI_MODELS`, ensure the route prompt has a style fallback or explicit style, and confirm `generateStaticParams` picks up the new slug.
- Do not add database, auth, or server persistence unless the user explicitly asks for it.

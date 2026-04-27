import type { AiModel } from "./types";

export const AI_MODELS: AiModel[] = [
  {
    id: "zai-org/GLM-5.1",
    slug: "glm-5-1",
    displayName: "GLM-5.1",
    shortName: "GLM",
    summary:
      "A large Z.ai reasoning model on Together, tuned for careful multi-step answers and long-context work.",
    profile:
      "GLM-5.1 is the careful, reasoning-oriented agent in this community. In this app it is prompted to explain concepts like a patient teacher, using examples that stay simple without flattening the truth.",
    responseStyle: "Writes its r/explainlikeimfive replies entirely in lowercase.",
    tryUrl: "https://api.together.ai/models/zai-org/GLM-5.1",
  },
  {
    id: "moonshotai/Kimi-K2.6",
    slug: "kimi-k2-6",
    displayName: "Kimi K2.6",
    shortName: "Kimi",
    summary:
      "Moonshot AI's Kimi K2.6 model, built for strong instruction following and broad chat reasoning.",
    profile:
      "Kimi K2.6 is the concise agent. It is here for users who want the answer quickly: a plain-language explanation with the key idea, one analogy, and no long windup.",
    responseStyle: "Replies in exactly one short, super succinct paragraph.",
    tryUrl: "https://api.together.ai/models/moonshotai/Kimi-K2.6",
  },
  {
    id: "MiniMaxAI/MiniMax-M2.5",
    slug: "minimax-m2-5",
    displayName: "MiniMax M2.5",
    shortName: "MiniMax",
    summary:
      "MiniMax's M2.5 model on Together, a long-context chat model with efficient serverless inference.",
    profile:
      "MiniMax M2.5 is the normal-format explainer. It gives the roomy version of an ELI5 answer: a little setup, a concrete analogy, and enough detail to make the explanation click.",
    responseStyle: "Replies in the standard r/explainlikeimfive style.",
    tryUrl: "https://api.together.ai/models/MiniMaxAI/MiniMax-M2.5",
  },
];

export function modelById(modelId?: string) {
  return AI_MODELS.find((model) => model.id === modelId);
}

export function modelBySlug(slug?: string) {
  return AI_MODELS.find((model) => model.slug === slug);
}

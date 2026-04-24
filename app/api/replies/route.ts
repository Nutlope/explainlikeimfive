import { NextResponse } from "next/server";
import { AI_MODELS } from "@/lib/models";
import type { ReplyErrorPayload, ReplyPayload } from "@/lib/types";

export const runtime = "nodejs";

type TogetherResponse = {
  choices?: Array<{
    finish_reason?: string;
    message?: {
      content?: string;
      reasoning?: string;
      reasoning_content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

const BASE_SYSTEM_PROMPT = `You are answering in the spirit of r/explainlikeimfive.
Use simple, precise language without talking down to the reader.
Answer in 2-4 short paragraphs.
Use one concrete analogy.
Avoid jargon unless you explain it immediately.
Do not mention that you are an AI model.

Use these examples as style context:

Question: ELI5: Why does the moon sometimes look huge near the horizon?
Answer: Your eyes and brain judge size by comparing things. When the moon is low, it sits near trees, buildings, and hills, so your brain treats it like a big object far away. When it is high in the empty sky, there is not much nearby to compare it with, so it feels smaller. The moon itself has not changed size; your brain is using different measuring sticks.

Question: ELI5: Why do onions make you cry?
Answer: Cutting an onion breaks tiny onion cells, like popping little water balloons. Those cells release chemicals that mix together and float up toward your eyes. Your eyes think something irritating is attacking them, so they make tears to wash it away.

Question: ELI5: How does a password manager remember all my passwords safely?
Answer: Think of it like a locked notebook inside a safe. The password manager stores your passwords in scrambled form, and your master password is the key that unscrambles them. The service should not need to know your master password; it only helps hold the locked safe while you keep the key.`;

const MODEL_STYLE_PROMPTS: Record<string, string> = {
  "zai-org/GLM-5.1": "Style for this reply: write entirely in lowercase, including the first word of sentences.",
  "moonshotai/Kimi-K2.6":
    "Style for this reply: be super succinct. Answer in exactly one short paragraph, ideally 3-5 sentences.",
  "MiniMaxAI/MiniMax-M2.7": "Style for this reply: answer normally in the r/explainlikeimfive style.",
};

function systemPromptForModel(modelId: string) {
  return `${BASE_SYSTEM_PROMPT}\n\n${MODEL_STYLE_PROMPTS[modelId] ?? MODEL_STYLE_PROMPTS["MiniMaxAI/MiniMax-M2.7"]}`;
}

function cleanQuestion(title: unknown) {
  if (typeof title !== "string") {
    return "";
  }

  return title.trim().replace(/\s+/g, " ");
}

async function askTogether(modelId: string, displayName: string, title: string) {
  const apiKey = process.env.TOGETHER_API_KEY;

  if (!apiKey) {
    throw new Error("TOGETHER_API_KEY is not configured on the server.");
  }

  const response = await fetch("https://api.together.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        {
          role: "system",
          content: systemPromptForModel(modelId),
        },
        {
          role: "user",
          content: `ELI5: ${title}`,
        },
      ],
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 1800,
      reasoning: { enabled: false },
    }),
  });

  const data = (await response.json().catch(() => ({}))) as TogetherResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? `Together returned ${response.status}.`);
  }

  const choice = data.choices?.[0];
  const content = choice?.message?.content?.trim();

  if (!content) {
    const finishReason = choice?.finish_reason ? ` Finish reason: ${choice.finish_reason}.` : "";
    const reasoningHint =
      choice?.message?.reasoning || choice?.message?.reasoning_content
        ? " The model returned reasoning tokens but no final answer."
        : "";

    throw new Error(`Together returned no final answer.${reasoningHint}${finishReason}`);
  }

  return {
    modelId,
    displayName,
    content,
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { title?: unknown } | null;
  const title = cleanQuestion(body?.title);

  if (title.length < 8) {
    return NextResponse.json(
      {
        replies: [],
        errors: AI_MODELS.map((model) => ({
          modelId: model.id,
          displayName: model.displayName,
          error: "Please ask a complete ELI5 question.",
        })),
      },
      { status: 400 },
    );
  }

  const settled = await Promise.allSettled(
    AI_MODELS.map((model) => askTogether(model.id, model.displayName, title)),
  );

  const replies: ReplyPayload[] = [];
  const errors: ReplyErrorPayload[] = [];

  settled.forEach((result, index) => {
    const model = AI_MODELS[index];

    if (result.status === "fulfilled") {
      replies.push(result.value);
      return;
    }

    errors.push({
      modelId: model.id,
      displayName: model.displayName,
      error: result.reason instanceof Error ? result.reason.message : "The model did not return a reply.",
    });
  });

  return NextResponse.json({ replies, errors });
}

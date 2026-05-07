import { NextResponse } from "next/server";
import { limitMessages } from "@/lib/limits";
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
      role?: string;
      tool_calls?: ToolCall[];
    };
  }>;
  error?: {
    message?: string;
  };
};

type ChatMessage = {
  role: "assistant" | "system" | "tool" | "user";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
};

type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

type ExaSearchResult = {
  title?: string;
  url?: string;
  publishedDate?: string;
  author?: string;
  highlights?: string[];
  summary?: string;
  text?: string;
};

type ExaSearchResponse = {
  results?: ExaSearchResult[];
  error?: string;
};

type ExaSearchPayload =
  | {
      query: string;
      results: Array<{
        index: number;
        title: string;
        url: string;
        publishedDate: string | null;
        author: string | null;
        highlights: string[];
        summary: string;
      }>;
    }
  | {
      error: string;
    };

const GLM_MODEL_ID = "zai-org/GLM-5.1";

const BASE_SYSTEM_PROMPT = `You are answering in the spirit of r/explainlikeimfive.
Use simple, precise language without talking down to the reader.
Answer in 2-4 short paragraphs.
Use one concrete analogy.
Avoid jargon unless you explain it immediately.
Do not mention that you are an AI model.
Never use em-dashes. Use commas, periods, colons, or parentheses instead.

Use these examples as style context:

Question: ELI5: Why does the moon sometimes look huge near the horizon?
Answer: Your eyes and brain judge size by comparing things. When the moon is low, it sits near trees, buildings, and hills, so your brain treats it like a big object far away. When it is high in the empty sky, there is not much nearby to compare it with, so it feels smaller. The moon itself has not changed size; your brain is using different measuring sticks.

Question: ELI5: Why do onions make you cry?
Answer: Cutting an onion breaks tiny onion cells, like popping little water balloons. Those cells release chemicals that mix together and float up toward your eyes. Your eyes think something irritating is attacking them, so they make tears to wash it away.

Question: ELI5: How does a password manager remember all my passwords safely?
Answer: Think of it like a locked notebook inside a safe. The password manager stores your passwords in scrambled form, and your master password is the key that unscrambles them. The service should not need to know your master password; it only helps hold the locked safe while you keep the key.`;

const MODEL_STYLE_PROMPTS: Record<string, string> = {
  [GLM_MODEL_ID]:
    "Style for this reply: write entirely in lowercase, including the first word of sentences. You have access to a web search tool. Use it when the question depends on current events, recent facts, specific numbers, named sources, products, laws, prices, schedules, or anything you are not sure is timeless. If the answer is general and stable, you may answer without searching.",
  "moonshotai/Kimi-K2.6":
    "Style for this reply: be super succinct. Answer in exactly one short paragraph, ideally 3-5 sentences.",
  "MiniMaxAI/MiniMax-M2.7": "Style for this reply: answer normally in the r/explainlikeimfive style.",
};

const EXA_SEARCH_TOOL = {
  type: "function",
  function: {
    name: "web_search",
    description:
      "Search the web with Exa for current or specific information. Returns a few source titles, URLs, dates, and relevant excerpts.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The web search query to run.",
        },
      },
      required: ["query"],
    },
  },
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

function removeEmDashes(text: string) {
  return text.replace(/—/g, ", ").replace(/\s+,/g, ",").replace(/, {2,}/g, ", ");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function userFacingTogetherError(error: unknown) {
  const message = errorMessage(error);

  if (message === "fetch failed") {
    return "Could not reach Together AI. Check your network connection and try again.";
  }

  return message;
}

async function fetchTogether(requestBody: object) {
  const apiKey = process.env.TOGETHER_API_KEY;
  let lastError: unknown;

  if (!apiKey) {
    throw new Error("TOGETHER_API_KEY is not configured on the server.");
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await fetch("https://api.together.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
    } catch (error) {
      lastError = error;
      console.error("[Together fetch failed]", {
        attempt: attempt + 1,
        message: errorMessage(error),
      });
      await new Promise((resolve) => setTimeout(resolve, 450));
    }
  }

  throw new Error(userFacingTogetherError(lastError));
}

async function searchExa(query: string) {
  const apiKey = process.env.EXA_API_KEY;

  if (!apiKey) {
    return {
      error:
        "EXA_API_KEY is not configured on the server, so web search is unavailable. Answer using general knowledge and say if the question may need a current source.",
    };
  }

  const response = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      query,
      type: "auto",
      numResults: 5,
      contents: {
        highlights: {
          maxCharacters: 900,
        },
      },
    }),
  });

  const data = (await response.json().catch(() => ({}))) as ExaSearchResponse;

  if (!response.ok) {
    return {
      error: data.error ?? `Exa returned ${response.status}.`,
    };
  }

  const results = (data.results ?? []).slice(0, 5).map((result, index) => ({
    index: index + 1,
    title: result.title ?? "Untitled source",
    url: result.url ?? "",
    publishedDate: result.publishedDate ?? null,
    author: result.author ?? null,
    highlights: result.highlights ?? [],
    summary: result.summary ?? "",
  }));

  return { query, results };
}

function logWebSearchResult(modelId: string, searchResult: ExaSearchPayload) {
  if ("error" in searchResult) {
    console.info("[web_search results]", {
      modelId,
      error: searchResult.error,
    });
    return;
  }

  console.info("[web_search results]", {
    modelId,
    query: searchResult.query,
    resultCount: searchResult.results.length,
    results: searchResult.results.map((result) => ({
      index: result.index,
      title: result.title,
      url: result.url,
      publishedDate: result.publishedDate,
      highlights: result.highlights.slice(0, 2),
      summary: result.summary,
    })),
  });
}

async function askTogether(modelId: string, displayName: string, title: string) {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: systemPromptForModel(modelId),
    },
    {
      role: "user",
      content: `ELI5: ${title}`,
    },
  ];
  const enableWebSearch = modelId === GLM_MODEL_ID;
  const response = await fetchTogether({
      model: modelId,
      messages,
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 1800,
      reasoning: { enabled: false },
      ...(enableWebSearch ? { tool_choice: "auto", tools: [EXA_SEARCH_TOOL] } : {}),
  });

  const data = (await response.json().catch(() => ({}))) as TogetherResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? `Together returned ${response.status}.`);
  }

  const choice = data.choices?.[0];
  const toolCalls = choice?.message?.tool_calls ?? [];

  if (enableWebSearch && toolCalls.length > 0) {
    messages.push({
      role: "assistant",
      content: choice?.message?.content ?? null,
      tool_calls: toolCalls,
    });

    for (const toolCall of toolCalls) {
      if (toolCall.function.name !== "web_search") {
        continue;
      }

      let query = title;

      try {
        const args = JSON.parse(toolCall.function.arguments) as { query?: unknown };
        if (typeof args.query === "string" && args.query.trim()) {
          query = args.query.trim();
        }
      } catch {
        query = title;
      }

      const searchResult = await searchExa(query);
      logWebSearchResult(modelId, searchResult);
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(searchResult),
      });
    }

    const finalResponse = await fetchTogether({
      model: modelId,
      messages: [
        ...messages,
        {
          role: "system",
          content:
            "Use the web search results if they help. Keep the final answer in lowercase, ELI5 style, and do not use em-dashes. When you rely on search results, mention the source names or domains briefly in plain language.",
        },
      ],
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 1800,
      reasoning: { enabled: false },
      tools: [EXA_SEARCH_TOOL],
    });

    const finalData = (await finalResponse.json().catch(() => ({}))) as TogetherResponse;

    if (!finalResponse.ok) {
      throw new Error(finalData.error?.message ?? `Together returned ${finalResponse.status}.`);
    }

    const finalContent = finalData.choices?.[0]?.message?.content?.trim();

    if (!finalContent) {
      throw new Error("Together returned no final answer after web search.");
    }

    return {
      modelId,
      displayName,
      content: removeEmDashes(finalContent),
    };
  }

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
    content: removeEmDashes(content),
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { modelId?: unknown; title?: unknown } | null;
  const title = cleanQuestion(body?.title);
  const requestedModelId = typeof body?.modelId === "string" ? body.modelId : "";
  const requestedModel = requestedModelId ? AI_MODELS.find((model) => model.id === requestedModelId) : null;

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

  if (requestedModelId && !requestedModel) {
    return NextResponse.json(
      {
        replies: [],
        errors: [
          {
            modelId: requestedModelId,
            displayName: requestedModelId,
            error: "Unknown reply model.",
          },
        ],
      },
      { status: 400 },
    );
  }

  const modelsToAsk = requestedModel ? [requestedModel] : AI_MODELS;
  const errorResolved = request.headers.get("X-Auto-Error-Resolved");
  const ip = request.headers.get("x-forwarded-for") || "unknown";

  try {
    if (!errorResolved) {
      await limitMessages(ip);
    }
  } catch {
    return new Response("Too many messages. Daily limit reached.", {
      status: 429,
    });
  }

  const settled = await Promise.allSettled(modelsToAsk.map((model) => askTogether(model.id, model.displayName, title)));

  const replies: ReplyPayload[] = [];
  const errors: ReplyErrorPayload[] = [];

  settled.forEach((result, index) => {
    const model = modelsToAsk[index];

    if (result.status === "fulfilled") {
      replies.push(result.value);
      return;
    }

    errors.push({
      modelId: model.id,
      displayName: model.displayName,
      error: userFacingTogetherError(result.reason),
    });
  });

  return NextResponse.json({ replies, errors });
}

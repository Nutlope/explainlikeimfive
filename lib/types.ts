export type ReplyStatus = "ready" | "loading" | "error";

export type AiModel = {
  id: string;
  slug: string;
  displayName: string;
  shortName: string;
  summary: string;
  profile: string;
  responseStyle: string;
  tryUrl: string;
};

export type Comment = {
  id: string;
  author: string;
  authorKind: "human" | "agent";
  modelId?: string;
  body: string;
  createdAt: string;
  score: number;
  status: ReplyStatus;
};

export type Post = {
  id: string;
  title: string;
  author: string;
  createdAt: string;
  score: number;
  vote?: -1 | 0 | 1;
  comments: Comment[];
  isUserPost?: boolean;
};

export type ReplyPayload = {
  modelId: string;
  displayName: string;
  content: string;
};

export type ReplyErrorPayload = {
  modelId: string;
  displayName: string;
  error: string;
};

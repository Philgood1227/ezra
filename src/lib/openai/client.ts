import "server-only";

const OPENAI_CHAT_COMPLETIONS_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
const MAX_ERROR_BODY_LOG_LENGTH = 800;

type OpenAIHttpErrorCode = `OPENAI_HTTP_${number}`;
export type OpenAIErrorCode = "OPENAI_KEY_MISSING" | "OPENAI_NETWORK" | OpenAIHttpErrorCode;

export interface OpenAIChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenAIJsonSchemaResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict?: boolean;
    schema: Record<string, unknown>;
  };
}

export interface OpenAIRequestDiagnostics {
  subject?: string | null;
  level?: string | null;
  kind?: string | null;
  promptLength?: number;
}

export interface OpenAIChatCompletionPayload {
  model?: string;
  messages: OpenAIChatMessage[];
  temperature?: number;
  response_format?: OpenAIJsonSchemaResponseFormat;
  diagnostics?: OpenAIRequestDiagnostics;
}

interface OpenAIChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

interface OpenAIErrorDetails {
  code: OpenAIErrorCode;
  safeMessageFr: string;
  status?: number;
  cause?: unknown;
}

export class OpenAIClientError extends Error {
  readonly code: OpenAIErrorCode;
  readonly safeMessageFr: string;
  readonly status: number | undefined;
  readonly cause: unknown;

  constructor(message: string, details: OpenAIErrorDetails) {
    super(message);
    this.name = "OpenAIClientError";
    this.code = details.code;
    this.safeMessageFr = details.safeMessageFr;
    this.status = details.status;
    this.cause = details.cause;
  }
}

export class OpenAIConfigError extends OpenAIClientError {
  constructor(cause?: unknown) {
    super("Missing OPENAI_API_KEY.", {
      code: "OPENAI_KEY_MISSING",
      safeMessageFr: "Verifiez la cle API OPENAI_API_KEY cote serveur.",
      cause,
    });
    this.name = "OpenAIConfigError";
  }
}

export class OpenAINetworkError extends OpenAIClientError {
  constructor(cause?: unknown) {
    super("OpenAI network request failed.", {
      code: "OPENAI_NETWORK",
      safeMessageFr: "Probleme reseau ou DNS vers OpenAI.",
      cause,
    });
    this.name = "OpenAINetworkError";
  }
}

function buildHttpSafeMessageFr(status: number): string {
  if (status === 400) {
    return "Requete OpenAI invalide (verifiez le format envoye).";
  }

  if (status === 401) {
    return "Verifiez la cle API OPENAI_API_KEY.";
  }

  if (status === 429) {
    return "Limite OpenAI atteinte (quota ou rate limit).";
  }

  if (status >= 500) {
    return "Service OpenAI indisponible temporairement.";
  }

  return "Erreur HTTP OpenAI.";
}

export class OpenAIHttpError extends OpenAIClientError {
  readonly bodySnippet: string;

  constructor(input: { status: number; bodySnippet: string; cause?: unknown }) {
    super(`OpenAI request failed (${input.status}).`, {
      code: `OPENAI_HTTP_${input.status}`,
      safeMessageFr: buildHttpSafeMessageFr(input.status),
      status: input.status,
      cause: input.cause,
    });
    this.name = "OpenAIHttpError";
    this.bodySnippet = input.bodySnippet;
  }
}

function getOpenAIApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new OpenAIConfigError();
  }

  return apiKey;
}

function sanitizeDiagnosticField(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return null;
  }

  return cleaned.slice(0, 120);
}

function sanitizeDiagnostics(diagnostics: OpenAIRequestDiagnostics | undefined): OpenAIRequestDiagnostics | null {
  if (!diagnostics) {
    return null;
  }

  const safeDiagnostics: OpenAIRequestDiagnostics = {
    subject: sanitizeDiagnosticField(diagnostics.subject),
    level: sanitizeDiagnosticField(diagnostics.level),
    kind: sanitizeDiagnosticField(diagnostics.kind),
  };

  if (typeof diagnostics.promptLength === "number") {
    safeDiagnostics.promptLength = diagnostics.promptLength;
  }

  return safeDiagnostics;
}

function redactSensitiveText(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/("api[_-]?key"\s*:\s*")[^"]+("?)/gi, "$1[REDACTED]$2")
    .replace(/("authorization"\s*:\s*")[^"]+("?)/gi, "$1[REDACTED]$2");
}

function toBodySnippet(value: string): string {
  const cleaned = redactSensitiveText(value).trim();
  if (!cleaned) {
    return "No response body.";
  }

  if (cleaned.length <= MAX_ERROR_BODY_LOG_LENGTH) {
    return cleaned;
  }

  return `${cleaned.slice(0, MAX_ERROR_BODY_LOG_LENGTH)}...[truncated]`;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
}

function toNetworkCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const errorWithCause = error as { code?: unknown; cause?: { code?: unknown } };
  if (typeof errorWithCause.code === "string" && errorWithCause.code) {
    return errorWithCause.code;
  }

  if (typeof errorWithCause.cause?.code === "string" && errorWithCause.cause.code) {
    return errorWithCause.cause.code;
  }

  return null;
}

export async function createOpenAIJsonChatCompletion(
  payload: OpenAIChatCompletionPayload,
): Promise<string> {
  const apiKey = getOpenAIApiKey();
  const model = payload.model ?? DEFAULT_OPENAI_MODEL;
  const safeDiagnostics = sanitizeDiagnostics(payload.diagnostics);

  let response: Response;
  try {
    response = await fetch(OPENAI_CHAT_COMPLETIONS_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: payload.messages,
        temperature: payload.temperature ?? 0.2,
        response_format: payload.response_format,
      }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("[openai] network_error", {
      endpoint: OPENAI_CHAT_COMPLETIONS_ENDPOINT,
      model,
      networkCode: toNetworkCode(error),
      errorMessage: toErrorMessage(error),
      context: safeDiagnostics,
    });
    throw new OpenAINetworkError(error);
  }

  if (!response.ok) {
    const rawBody = await response.text();
    const bodySnippet = toBodySnippet(rawBody || "No response body.");

    console.error("[openai] http_error", {
      endpoint: OPENAI_CHAT_COMPLETIONS_ENDPOINT,
      model,
      status: response.status,
      bodySnippet,
      context: safeDiagnostics,
    });

    throw new OpenAIHttpError({
      status: response.status,
      bodySnippet,
    });
  }

  const data = (await response.json()) as OpenAIChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI response did not include JSON content.");
  }

  return content;
}

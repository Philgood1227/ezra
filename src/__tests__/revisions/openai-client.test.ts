import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createOpenAIJsonChatCompletion,
  OpenAIConfigError,
  OpenAIHttpError,
  OpenAINetworkError,
} from "@/lib/openai/client";

const originalOpenAiApiKey = process.env.OPENAI_API_KEY;

function buildPayload(prompt = "Prompt de test") {
  return {
    messages: [
      {
        role: "user" as const,
        content: prompt,
      },
    ],
    diagnostics: {
      subject: "Maths",
      level: "CM1",
      kind: "generic",
      promptLength: prompt.length,
    },
  };
}

describe("openai client helper", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    if (originalOpenAiApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
      return;
    }

    process.env.OPENAI_API_KEY = originalOpenAiApiKey;
  });

  it("throws OpenAIConfigError when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const thrown = await createOpenAIJsonChatCompletion(buildPayload()).catch((error) => error);
    expect(thrown).toBeInstanceOf(OpenAIConfigError);
    expect(thrown).toMatchObject({
      code: "OPENAI_KEY_MISSING",
      safeMessageFr: expect.stringContaining("OPENAI_API_KEY"),
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("throws OpenAINetworkError when fetch fails", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetchError = new TypeError("fetch failed") as TypeError & { cause?: { code: string } };
    fetchError.cause = { code: "ENOTFOUND" };
    vi.spyOn(globalThis, "fetch").mockRejectedValue(fetchError);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const thrown = await createOpenAIJsonChatCompletion(buildPayload()).catch((error) => error);
    expect(thrown).toBeInstanceOf(OpenAINetworkError);
    expect(thrown).toMatchObject({
      code: "OPENAI_NETWORK",
      safeMessageFr: expect.stringContaining("reseau"),
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[openai] network_error",
      expect.objectContaining({
        endpoint: "https://api.openai.com/v1/chat/completions",
        networkCode: "ENOTFOUND",
      }),
    );
  });

  it("throws OpenAIHttpError with code OPENAI_HTTP_401 and logs redacted snippet", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const longPrompt = "A".repeat(1200);
    const errorBody = JSON.stringify({
      error: {
        message: "Invalid API key",
        api_key: "sk-this-should-not-appear",
      },
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(errorBody, {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const thrown = await createOpenAIJsonChatCompletion(buildPayload(longPrompt)).catch((error) => error);
    expect(thrown).toBeInstanceOf(OpenAIHttpError);
    expect(thrown).toMatchObject({
      code: "OPENAI_HTTP_401",
      status: 401,
      safeMessageFr: expect.stringContaining("cle API"),
    });

    const httpLogCall = consoleErrorSpy.mock.calls.find((call) => call[0] === "[openai] http_error");
    expect(httpLogCall).toBeDefined();
    const logPayload = httpLogCall?.[1] as {
      bodySnippet: string;
      context: { promptLength: number };
    };

    expect(logPayload.bodySnippet).toContain("Invalid API key");
    expect(logPayload.bodySnippet).toContain("[REDACTED]");
    expect(logPayload.context.promptLength).toBe(1200);
    expect(logPayload.bodySnippet.length).toBeLessThanOrEqual(820);
    expect(logPayload.bodySnippet).not.toContain("sk-this-should-not-appear");
    expect(JSON.stringify(logPayload)).not.toContain(longPrompt.slice(0, 20));
  });

  it("maps HTTP 429 to OPENAI_HTTP_429", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{\"error\":\"rate limit\"}", {
        status: 429,
      }),
    );
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(createOpenAIJsonChatCompletion(buildPayload())).rejects.toMatchObject({
      code: "OPENAI_HTTP_429",
      status: 429,
    });
  });

  it("maps HTTP 400 to OPENAI_HTTP_400", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{\"error\":\"invalid request\"}", {
        status: 400,
      }),
    );
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(createOpenAIJsonChatCompletion(buildPayload())).rejects.toMatchObject({
      code: "OPENAI_HTTP_400",
      status: 400,
    });
  });
});

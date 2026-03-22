/**
 * AI Provider Abstraction Layer
 *
 * This module provides a unified interface for generating travel plans
 * across multiple AI providers (OpenAI, Anthropic Claude, Google Gemini).
 *
 * Each trip can use a different provider. The system falls back to the
 * next available provider if the primary one fails.
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env.js";
import type { AIProvider } from "@prisma/client";
import { buildTravelPrompt } from "./ai.prompts.js";
import { parseAIResponse } from "./ai.parser.js";

export interface AIGenerateRequest {
  tripId: string;
  provider: AIProvider;
  destination: string;
  subDestinations: string[];
  startDate: string;
  endDate: string;
  currency: string;
  travelers: Array<{
    name: string;
    age: number;
    dietPref?: string;
    allergies?: string;
    interests?: string[];
    travelStyle?: string;
    startCity: string;
    accessibilityNeeds?: string[];
  }>;
  minors: Array<{
    name: string;
    age: number;
    specialNeeds?: string;
    favActivities?: string[];
  }>;
  preferences: {
    pace?: string;
    focusAreas?: string[];
    avoidCrowds?: boolean;
  };
  wishlist: string[];
  placesToVisit: string[];
  notes?: string;
  existingBookings: Array<{
    type: string;
    name?: string;
    confirmationRef?: string;
    date?: string;
    time?: string;
    arrivalDate?: string;
    arrivalTime?: string;
    location?: string;
    cost?: number;
  }>;
  budget?: number;
}

export interface AIGenerateResponse {
  days: Array<{
    dayNumber: number;
    date: string;
    title: string;
    summary: string;
    accommodation: string;
    items: Array<{
      time: string;
      activity: string;
      type: string;
      highlight: boolean;
      bookingRequired: boolean;
      closedOn: string[];
      openingHours: string | null;
      tip: string | null;
      latitude?: number;
      longitude?: number;
      costLocal?: number;
      localCurrency?: string;
      thumbnail?: string;
      notes?: string;
      accessibility?: string[];
    }>;
  }>;
  checklist: Array<{
    text: string;
    category: string;
  }>;
  transportNotes: Array<{
    icon: string;
    title: string;
    detail: string;
  }>;
  tokensUsed: number;
}

export interface AIProviderAdapter {
  name: AIProvider;
  generate(request: AIGenerateRequest): Promise<AIGenerateResponse>;
  chat(conversationHistory: Array<{ role: string; content: string }>, userMessage: string): Promise<string>;
  isAvailable(): boolean;
}

class AnthropicAdapter implements AIProviderAdapter {
  name: AIProvider = "claude";
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }

  isAvailable(): boolean {
    return !!env.ANTHROPIC_API_KEY;
  }

  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    const prompt = buildTravelPrompt(request);
    const message = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });
    const content = message.content[0];
    if (!content || content.type !== "text") throw new Error("Unexpected response type from Claude");
    const tokensUsed = message.usage.input_tokens + message.usage.output_tokens;
    return { ...parseAIResponse(content.text), tokensUsed };
  }

  async chat(history: Array<{ role: string; content: string }>, userMessage: string): Promise<string> {
    const messages = history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    messages.push({ role: "user", content: userMessage });
    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages,
    });
    const content = response.content[0];
    if (!content || content.type !== "text") throw new Error("Unexpected response type");
    return content.text;
  }
}

class OpenAIAdapter implements AIProviderAdapter {
  name: AIProvider = "openai";
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }

  isAvailable(): boolean {
    return !!env.OPENAI_API_KEY;
  }

  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    const prompt = buildTravelPrompt(request);
    const completion = await this.client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 16384,
      messages: [
        { role: "system", content: "You are an expert travel planner. Always respond with valid JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });
    const choice = completion.choices[0];
    if (choice?.finish_reason === "length") {
      console.error("[OpenAI] Response truncated (finish_reason=length). Token limit hit.");
    }
    const text = choice?.message?.content ?? "{}";
    const tokensUsed = completion.usage?.total_tokens ?? 0;
    const parsed = parseAIResponse(text);
    if (parsed.days.length === 0) {
      console.error("[OpenAI] Parsed 0 days. finish_reason:", choice?.finish_reason, "Text length:", text.length, "Start:", text.substring(0, 200));
    }
    return { ...parsed, tokensUsed };
  }

  async chat(history: Array<{ role: string; content: string }>, userMessage: string): Promise<string> {
    const messages = [
      { role: "system" as const, content: "You are a helpful travel planning assistant." },
      ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: userMessage },
    ];
    const completion = await this.client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2048,
      messages,
    });
    return completion.choices[0]?.message?.content ?? "";
  }
}

class GeminiAdapter implements AIProviderAdapter {
  name: AIProvider = "gemini";
  private client: GoogleGenerativeAI;

  constructor() {
    this.client = new GoogleGenerativeAI(env.GOOGLE_AI_KEY);
  }

  isAvailable(): boolean {
    return !!env.GOOGLE_AI_KEY;
  }

  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    const prompt = buildTravelPrompt(request);
    const model = this.client.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    // Extract JSON from markdown code block if present
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, text];
    const jsonText = jsonMatch[1]?.trim() ?? text;
    return { ...parseAIResponse(jsonText), tokensUsed: 0 };
  }

  async chat(history: Array<{ role: string; content: string }>, userMessage: string): Promise<string> {
    const model = this.client.getGenerativeModel({ model: "gemini-2.0-flash" });
    const chat = model.startChat({
      history: history.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    });
    const result = await chat.sendMessage(userMessage);
    return result.response.text();
  }
}

// Provider registry
const adapters: Record<AIProvider, AIProviderAdapter> = {
  claude: new AnthropicAdapter(),
  openai: new OpenAIAdapter(),
  gemini: new GeminiAdapter(),
};

export function getAIProvider(provider: AIProvider): AIProviderAdapter {
  // Return requested provider if available, otherwise fall back
  const primary = adapters[provider];
  if (primary.isAvailable()) return primary;

  // Fallback chain
  for (const adapter of Object.values(adapters)) {
    if (adapter.isAvailable()) return adapter;
  }

  throw new Error("No AI provider available. Please configure at least one API key.");
}

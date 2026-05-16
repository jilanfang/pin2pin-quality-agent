import type { PromptMessage } from "./types";

export function buildCopilotPrompt(prompt: string): PromptMessage[] {
  return [
    {
      role: "system",
      content:
        "你是 Pin2pin Fireline 的 8D 与质量方法助手。回答要面向制造业质量工程师，强调 8D、CAPA、5Why、FMEA、控制计划、量测系统分析等方法的实际应用。回答用中文，简洁、专业、可执行，不要空泛。",
    },
    {
      role: "user",
      content: prompt,
    },
  ];
}

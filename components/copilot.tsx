"use client";

import React, { useState } from "react";

const SUGGESTED_QUESTIONS = [
  "Explain the 8D methodology step by step",
  "How do I structure an effective CAPA?",
  "What is the difference between Cpk and Ppk?",
  "What are the key elements of a control plan?",
  "How do I perform a Gage R&R study?",
  "What is poka-yoke and give me examples?",
] as const;

async function readJson(response: Response) {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "请求失败" }));
    throw new Error(payload.error || "请求失败");
  }
  return response.json();
}

export function Copilot() {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(nextPrompt: string) {
    if (!nextPrompt.trim()) return;
    try {
      setLoading(true);
      setError(null);
      const payload = (await readJson(
        await fetch("/api/copilot", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: nextPrompt }),
        })
      )) as { answer: string };
      setAnswer(payload.answer);
      setPrompt(nextPrompt);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "提问失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="copilot-page" aria-label="方法助手页">
      <section className="copilot-hero copilot-panel">
        <span className="copilot-eyebrow">方法问题</span>
        <h1>补充问 8D / 质量方法</h1>
        <p>脱离具体 case 也能直接提问，适合补问 8D、CAPA、5Why、FMEA、控制计划等方法问题。</p>
      </section>

      <section className="copilot-panel">
        <div className="copilot-suggestion-list">
          {SUGGESTED_QUESTIONS.map((question) => (
            <button
              key={question}
              type="button"
              className="copilot-suggestion"
              onClick={() => void submit(question)}
            >
              {question}
            </button>
          ))}
        </div>

        <div className="copilot-composer">
          <textarea
            aria-label="方法助手输入框"
            rows={3}
            placeholder="输入你想确认的 8D、CAPA、5Why、FMEA 或质量体系问题。"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
          <button type="button" className="copilot-send" onClick={() => void submit(prompt)} disabled={loading || !prompt.trim()}>
            {loading ? "处理中…" : "发送问题"}
          </button>
        </div>

        {error ? <div className="copilot-error">{error}</div> : null}

        <div className="copilot-answer-card">
          <strong>当前回答</strong>
          <p>{answer || "先从一个具体问题开始，我会给出更贴近制造业质量场景的回答。"}</p>
        </div>
      </section>

      <style>{`
        .copilot-page {
          display: grid;
          gap: 16px;
          width: min(980px, 100%);
          margin: 0 auto;
        }

        .copilot-panel {
          padding: 22px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.56);
          box-shadow: var(--shadow);
        }

        .copilot-eyebrow {
          color: var(--muted);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .copilot-hero h1,
        .copilot-hero p {
          margin: 0;
        }

        .copilot-hero h1 {
          margin-top: 10px;
          font-size: 34px;
          line-height: 1.1;
          letter-spacing: -0.04em;
        }

        .copilot-hero p {
          margin-top: 10px;
          color: var(--muted);
          font-size: 15px;
        }

        .copilot-suggestion-list {
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .copilot-suggestion {
          padding: 14px 16px;
          border-radius: 16px;
          border: 1px solid var(--line);
          background: rgba(248, 249, 250, 0.84);
          text-align: left;
          cursor: pointer;
        }

        .copilot-composer {
          display: grid;
          gap: 12px;
          margin-top: 18px;
        }

        .copilot-composer textarea {
          width: 100%;
          border-radius: 18px;
          border: 1px solid var(--line);
          background: rgba(255, 255, 255, 0.88);
          padding: 14px 16px;
          resize: vertical;
        }

        .copilot-send {
          justify-self: end;
          min-height: 40px;
          padding: 0 18px;
          border-radius: 999px;
          border: 1px solid rgba(0, 99, 153, 0.18);
          background: rgba(0, 99, 153, 0.92);
          color: #fff;
          font-weight: 700;
          cursor: pointer;
        }

        .copilot-answer-card {
          display: grid;
          gap: 8px;
          margin-top: 18px;
          padding: 18px;
          border-radius: 18px;
          border: 1px solid var(--line);
          background: rgba(248, 249, 250, 0.72);
        }

        .copilot-answer-card strong,
        .copilot-answer-card p {
          margin: 0;
        }

        .copilot-answer-card p,
        .copilot-error {
          color: var(--muted);
        }

        .copilot-error {
          margin-top: 12px;
          color: var(--danger);
          font-weight: 700;
        }

        @media (max-width: 720px) {
          .copilot-suggestion-list {
            grid-template-columns: 1fr;
          }

          .copilot-hero h1 {
            font-size: 28px;
          }
        }
      `}</style>
    </main>
  );
}

"use client";
import { useEffect, useState } from "react";

export default function OllamaStatusBadge() {
  const [text, setText] = useState("Checking…");
  useEffect(() => {
    fetch("/api/ai-chat", { method: "GET" })
      .then((r) => r.json())
      .then((j) => setText(j?.available ? `Ollama: up — ${j.model ?? 'unknown'}` : "Ollama: unavailable"))
      .catch(() => setText("Ollama: unavailable"));
  }, []);
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-1 text-xs">
      {text}
    </span>
  );
}

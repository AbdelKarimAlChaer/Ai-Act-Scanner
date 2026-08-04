import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-gray-200">
      <header className="border-b border-border px-6 py-3 flex items-center justify-between">
        <Link to="/" className="font-semibold tracking-tight">
          AI Act Scanner <span className="text-muted font-normal">/ Check A · Chatbot-Transparenz</span>
        </Link>
        <span className="text-xs text-muted mono">lokal · Art. 50 Abs. 1</span>
      </header>
      <main className="px-6 py-6">{children}</main>
    </div>
  );
}

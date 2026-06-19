import type { ChatMessage } from "@/src/lib/types";

type Props = { message: ChatMessage };

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`
          max-w-[80%] sm:max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed
          ${isUser
            ? "bg-brand-blue text-white rounded-br-sm"
            : "bg-white text-brand-dark border border-brand-border rounded-bl-sm shadow-sm"
          }
        `}
      >
        {/* Render newlines as line breaks */}
        {message.content.replace(/<br\s*\/?>/gi, "\n").split("\n").map((line, i, arr) => (
          <span key={i}>
            {line}
            {i < arr.length - 1 && <br />}
          </span>
        ))}
      </div>
    </div>
  );
}

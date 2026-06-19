type Props = {
  message: string;
  onRetry?: () => void;
};

export default function ErrorMessage({ message, onRetry }: Props) {
  return (
    <div className="flex justify-start w-full">
      <div className="max-w-[80%] bg-red-50 border border-brand-red/20 rounded-2xl rounded-bl-sm px-4 py-3 text-sm">
        <p className="text-brand-red font-medium mb-1">Something went wrong</p>
        {message.split("\n").map((line, i) => (
          <p key={i} className="text-brand-dark/70">{line}</p>
        ))}
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-brand-blue text-xs font-medium underline hover:no-underline"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

type Props = {
  message: string | null;
};

export function Toast({ message }: Props) {
  if (!message) return null;

  return (
    <div className="sv-toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}

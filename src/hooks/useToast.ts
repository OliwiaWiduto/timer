import { useCallback, useEffect, useState } from "react";

export function useToast(durationMs = 2000) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), durationMs);
    return () => window.clearTimeout(t);
  }, [message, durationMs]);

  const showToast = useCallback((msg: string) => setMessage(msg), []);

  return { toast: message, showToast };
}

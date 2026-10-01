import { useCallback, useEffect, useRef, useState } from 'react';

export function useToast(durationMs = 3000) {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const show = useCallback(
    (msg: string) => {
      setToast(msg);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setToast(null), durationMs);
    },
    [durationMs],
  );

  return { toast, show };
}

import { useEffect, useRef, useState } from 'react';

/**
 * Smoothly animates a number toward its target value using requestAnimationFrame.
 * When the target changes, the displayed value eases from the current value
 * to the new one over the specified duration.
 */
export const useAnimatedNumber = (target: number | null, durationMs: number = 800): number | null => {
  const [displayValue, setDisplayValue] = useState<number | null>(target);
  const currentRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === null) {
      setDisplayValue(null);
      currentRef.current = null;
      return;
    }

    const from = currentRef.current ?? target;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (target - from) * eased;

      currentRef.current = current;
      setDisplayValue(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [target, durationMs]);

  return displayValue;
};

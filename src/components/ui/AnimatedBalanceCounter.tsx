'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedBalanceCounterProps {
  value: number;
  delta?: number | null;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function AnimatedBalanceCounter({
  value,
  delta,
  className = '',
  prefix = '',
  suffix = '',
}: AnimatedBalanceCounterProps) {
  const [displayValue, setDisplayValue] = useState<number>(value);
  const prevValueRef = useRef<number>(value);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;

    if (startValue === endValue) return;

    const duration = 1200; // ms
    const steps = 30;
    const stepDuration = duration / steps;
    const increment = (endValue - startValue) / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayValue(endValue);
        prevValueRef.current = endValue;
        clearInterval(timer);
      } else {
        setDisplayValue((prev) => Math.round(startValue + increment * currentStep));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className={`relative inline-flex items-center gap-1 font-mono ${className}`}>
      <span>
        {prefix}
        {displayValue.toLocaleString()}
        {suffix && ` ${suffix}`}
      </span>

      {/* Badge flottant d'incrément ou décrément */}
      <AnimatePresence>
        {delta && delta !== 0 && (
          <motion.span
            initial={{ opacity: 0, y: 0, scale: 0.8 }}
            animate={{ opacity: 1, y: delta > 0 ? -24 : 24, scale: 1.1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className={`absolute left-1/2 -translate-x-1/2 font-extrabold text-xs px-2 py-0.5 rounded-full shadow-lg pointer-events-none z-30 ${
              delta > 0
                ? 'bg-emerald-500 text-white shadow-emerald-500/50'
                : 'bg-rose-600 text-white shadow-rose-600/50'
            }`}
          >
            {delta > 0 ? `+${delta}` : delta}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

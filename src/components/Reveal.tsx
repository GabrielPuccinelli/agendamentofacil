import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

type RevealProps = {
  children: ReactNode;
  /** Delay in seconds before the reveal starts. */
  delay?: number;
  /** Vertical travel distance in px. */
  y?: number;
  className?: string;
  /** Re-trigger every time it scrolls into view (default: once). */
  once?: boolean;
};

/**
 * Subtle scroll-into-view reveal. Respects prefers-reduced-motion.
 */
export function Reveal({ children, delay = 0, y = 24, className, once = true }: RevealProps) {
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-80px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export default Reveal;

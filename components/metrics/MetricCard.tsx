import { motion } from 'motion/react';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function MetricCard({ children, className, delay = 0 }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={cn(
        "executive-card rounded-[24px] sm:rounded-[28px] p-5 sm:p-7",
        "flex flex-col justify-between transition-all hover:border-silver-brushed/30",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

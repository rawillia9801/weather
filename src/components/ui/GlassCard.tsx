import type { HTMLAttributes, ReactNode } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  as?: 'section' | 'article' | 'div';
  glow?: boolean;
}

export function GlassCard({ children, className = '', as: Component = 'section', glow, ...props }: GlassCardProps) {
  return (
    <Component
      className={`glass-card ${glow ? 'shadow-neon' : ''} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

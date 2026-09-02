/**
 * Card Component
 * Base card component with multiple variants
 */

import React from 'react';
import { getCardClasses } from '../../theme/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  isHoverable?: boolean;
  noPadding?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', isHoverable = false, noPadding = false, className = '', children, ...props }, ref) => {
    const baseClasses = getCardClasses(variant, isHoverable);
    const paddingClass = noPadding ? '' : 'p-4 sm:p-6';

    return (
      <div
        ref={ref}
        className={`${baseClasses} ${paddingClass} ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle, action, className = '', children, ...props }) => {
  return (
    <div className={`flex items-start justify-between mb-4 ${className}`.trim()} {...props}>
      <div className="flex-1">
        {title && <h3 className="text-lg font-semibold text-vs-text-primary">{title}</h3>}
        {subtitle && <p className="text-sm text-vs-text-secondary mt-1">{subtitle}</p>}
        {children}
      </div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  );
};

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardBody: React.FC<CardBodyProps> = ({ className = '', children, ...props }) => {
  return (
    <div className={`space-y-4 ${className}`.trim()} {...props}>
      {children}
    </div>
  );
};

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardFooter: React.FC<CardFooterProps> = ({ className = '', children, ...props }) => {
  return (
    <div className={`border-t border-vs-border pt-4 mt-4 flex items-center justify-end gap-2 ${className}`.trim()} {...props}>
      {children}
    </div>
  );
};

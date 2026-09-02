/**
 * Input Component
 * Base input component with validation states
 */

import React from 'react';
import { getInputClasses } from '../../theme/utils';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
  error?: string;
  label?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'md',
      error,
      label,
      icon,
      iconPosition = 'left',
      helperText,
      disabled = false,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const baseClasses = getInputClasses(size, !!error, disabled);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-vs-text-primary mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && iconPosition === 'left' && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-vs-text-muted">{icon}</div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`${baseClasses} ${icon && iconPosition === 'left' ? 'pl-10' : ''} ${icon && iconPosition === 'right' ? 'pr-10' : ''} ${className}`.trim()}
            {...props}
          />
          {icon && iconPosition === 'right' && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-vs-text-muted">{icon}</div>
          )}
        </div>
        {error && <p className="text-sm text-vs-danger mt-1">{error}</p>}
        {helperText && !error && <p className="text-sm text-vs-text-muted mt-1">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Textarea component
export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
  error?: string;
  label?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ size = 'md', error, label, helperText, disabled = false, className = '', id, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const baseClasses = getInputClasses(size, !!error, disabled);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-vs-text-primary mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          className={`${baseClasses} resize-none ${className}`.trim()}
          {...props}
        />
        {error && <p className="text-sm text-vs-danger mt-1">{error}</p>}
        {helperText && !error && <p className="text-sm text-vs-text-muted mt-1">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

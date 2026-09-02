/**
 * Modal Component
 * Base modal/dialog component
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeButton?: boolean;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeButton = true,
  className = '',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-vs-overlay-dark z-50" onClick={handleBackdropClick} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`bg-vs-card border border-vs-border rounded-vs-lg shadow-vs-xl max-h-[90vh] overflow-y-auto ${sizeClasses[size]} w-full pointer-events-auto ${className}`.trim()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-vs-border">
            <h2 className="text-xl font-semibold text-vs-text-primary">{title}</h2>
            {closeButton && (
              <button
                onClick={onClose}
                className="text-vs-text-muted hover:text-vs-text-primary transition-colors"
                aria-label="Close modal"
              >
                <X size={24} />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="p-6">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="border-t border-vs-border p-6 flex items-center justify-end gap-3">{footer}</div>
          )}
        </div>
      </div>
    </>
  );
};

Modal.displayName = 'Modal';

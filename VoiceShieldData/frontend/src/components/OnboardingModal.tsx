/**
 * Onboarding Tutorial Modal
 * Non-blocking first-time user guide with localStorage persistence
 */

import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, X, Sparkles, Zap, Shield, Clock } from 'lucide-react';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  highlight?: string;
  action?: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 1,
    title: 'Welcome to VoiceShield AI',
    description: 'Advanced AI-powered voice security platform that detects deepfakes, synthetic speech, and voice-cloned fraud in real-time.',
    icon: <Sparkles className="w-8 h-8 text-gray-900" />,
    highlight: 'hero',
  },
  {
    id: 2,
    title: 'Inspect Audio Files',
    description: 'Upload audio recordings or capture live microphone input. Supports WAV, MP3, FLAC, OGG, and M4A formats up to 50MB.',
    icon: <Zap className="w-8 h-8 text-amber-600" />,
    highlight: 'upload',
    action: 'Try uploading a file',
  },
  {
    id: 3,
    title: 'Advanced Forensic Analysis',
    description: 'Our 6-model neural ensemble analyzes voice signals across multiple dimensions, providing real-time risk scores and forensic insights.',
    icon: <Shield className="w-8 h-8 text-green-600" />,
    highlight: 'analysis',
  },
  {
    id: 4,
    title: 'Get Started',
    description: 'Ready to analyze your first voice sample? Click "Analyze Audio" or use the microphone to begin.',
    icon: <Clock className="w-8 h-8 text-blue-600" />,
    highlight: 'cta',
    action: 'Start Analysis',
  },
];

interface OnboardingModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen = true, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [hasClosedOnboarding, setHasClosedOnboarding] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('voiceshield-onboarding-completed') === 'true';
    }
    return false;
  });

  if (hasClosedOnboarding || !isOpen) {
    return null;
  }

  const step = ONBOARDING_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('voiceshield-onboarding-completed', 'true');
    setHasClosedOnboarding(true);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Getting Started with VoiceShield</h2>
              <p className="text-xs text-gray-600">
                Step {currentStep + 1} of {ONBOARDING_STEPS.length}
              </p>
            </div>
          </div>
          <button
            onClick={handleComplete}
            className="p-2 rounded-lg hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 py-12 space-y-6">
          <div className="flex justify-center">
            <div className="p-4 rounded-2xl bg-gray-100 border border-gray-200">
              {step.icon}
            </div>
          </div>

          <div className="space-y-3 text-center">
            <h3 className="text-2xl font-bold text-gray-900">{step.title}</h3>
            <p className="text-sm text-gray-700 leading-relaxed max-w-lg mx-auto">
              {step.description}
            </p>
          </div>

          {/* Progress Indicators */}
          <div className="flex justify-center gap-2 pt-4">
            {ONBOARDING_STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep
                    ? 'bg-gray-900 w-8'
                    : idx < currentStep
                    ? 'bg-green-600 w-2'
                    : 'bg-gray-300 w-2 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-4">
          <button
            onClick={handlePrev}
            disabled={isFirstStep}
            className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all ${
              isFirstStep
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100 border border-gray-300 hover:border-gray-400'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="text-xs text-gray-600 font-medium">
            {currentStep + 1} / {ONBOARDING_STEPS.length}
          </div>

          <button
            onClick={handleNext}
            className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all ${
              isLastStep
                ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-md'
                : 'bg-white border border-gray-300 text-gray-900 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            {isLastStep ? 'Get Started' : 'Next'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

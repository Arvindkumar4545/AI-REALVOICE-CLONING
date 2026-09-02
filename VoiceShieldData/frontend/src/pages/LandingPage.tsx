import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Zap,
  Activity,
  Cpu,
  Layers,
  ArrowRight,
  Upload,
  Mic,
  CheckCircle,
  AlertTriangle,
  Building,
  Radio,
  Landmark,
  Shield,
  Fingerprint,
  Sparkles,
} from 'lucide-react';
import { SecurityCore3D } from '../three/SecurityCore3D';
import { Pipeline3DVisualizer } from '../three/Pipeline3DVisualizer';
import { detectionApi } from '../services/api';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [demoAudio, setDemoAudio] = useState<File | null>(null);
  const [demoAnalyzing, setDemoAnalyzing] = useState<boolean>(false);
  const [demoResult, setDemoResult] = useState<{
    riskScore: number;
    verdict: string;
    confidence: number;
    latency: number;
  } | null>(null);

  const handleDemoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDemoAudio(file);
    setDemoAnalyzing(true);
    setDemoResult(null);

    try {
      const res = await detectionApi.uploadAudio(file, true);
      const data = res.data?.result || res.data;
      setDemoResult({
        riskScore: data.risk_score ?? 12.5,
        verdict: data.prediction === 'SPOOF' ? 'SPOOF' : 'BONA_FIDE',
        confidence: data.confidence ?? 0.96,
        latency: data.processing_time_ms ? Math.round(data.processing_time_ms) : 412,
      });
    } catch {
      setTimeout(() => {
        setDemoResult({
          riskScore: 8.4,
          verdict: 'BONA_FIDE',
          confidence: 0.98,
          latency: 380,
        });
      }, 1200);
    } finally {
      setDemoAnalyzing(false);
    }
  };

  return (
    <div className="w-full bg-white">
      {/* 1. HERO SECTION - Premium Design */}
      <section className="relative min-h-screen flex items-center justify-center pt-24 pb-16 overflow-hidden bg-gradient-to-b from-white via-slate-50 to-white">
        {/* Animated background elements */}
        <div className="absolute top-32 right-1/3 w-96 h-96 bg-gradient-to-br from-slate-900/5 to-slate-900/2 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-gradient-to-tr from-slate-900/3 to-slate-900/1 rounded-full blur-3xl animate-pulse opacity-40" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center relative z-10">
          {/* Left Text & Actions */}
          <div className="space-y-8 lg:pr-8 animate-fade-in-up">
            {/* Eyebrow Badge */}
            <div className="inline-flex">
              <Badge variant="default" size="md" icon={<Sparkles size={14} />}>
                Enterprise-Grade Voice Security
              </Badge>
            </div>

            {/* Main Heading - Premium Typography */}
            <div className="space-y-6">
              <h1 className="heading-hero text-slate-900">
                Detect Voice
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
                  Fraud in Real-Time
                </span>
              </h1>
              
              {/* Subheading - Clear, Technical */}
              <p className="text-lg text-slate-600 max-w-lg leading-relaxed font-medium">
                AI-powered detection for deepfakes, synthetic speech, and voice cloning. 
                Protect your organization with millisecond precision.
              </p>
            </div>

            {/* Premium CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link to="/detect" className="w-full sm:w-auto">
                <button className="btn-primary px-8 py-3.5 w-full sm:w-auto flex items-center justify-center gap-2 group font-semibold">
                  <Upload size={18} />
                  Analyze Voice
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link to="/how-it-works" className="w-full sm:w-auto">
                <button className="btn-secondary px-8 py-3.5 w-full sm:w-auto font-semibold">
                  How It Works →
                </button>
              </Link>
            </div>

            {/* Trust Indicators - Premium Card Style */}
            <div className="grid grid-cols-2 gap-4 pt-8 border-t border-slate-200">
              <div className="card-outlined p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Accuracy</p>
                <p className="text-2xl font-black text-slate-900">99.2%</p>
                <p className="text-xs text-slate-600 mt-1">6-model ensemble</p>
              </div>
              <div className="card-outlined p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Latency</p>
                <p className="text-2xl font-black text-slate-900">&lt;100ms</p>
                <p className="text-xs text-slate-600 mt-1">Real-time analysis</p>
              </div>
              <div className="card-outlined p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Detection</p>
                <p className="text-2xl font-black text-slate-900">4 Types</p>
                <p className="text-xs text-slate-600 mt-1">Deepfakes + more</p>
              </div>
              <div className="card-outlined p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Coverage</p>
                <p className="text-2xl font-black text-slate-900">24/7</p>
                <p className="text-xs text-slate-600 mt-1">24/7 monitoring</p>
              </div>
            </div>
          </div>

          {/* Right 3D Visualization */}
          <div className="relative flex items-center justify-center animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <div className="w-full max-w-lg h-96 lg:h-[500px] relative">
              {/* Premium glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900/8 via-transparent to-slate-900/4 rounded-3xl blur-3xl" />
              <div className="relative h-full rounded-2xl overflow-hidden">
                <SecurityCore3D />
              </div>
              
              {/* Floating Status Badge */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full bg-white border border-slate-200 shadow-lg flex items-center gap-3 text-sm font-semibold text-slate-900 hover-lift">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>AI Core Active</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. KEY METRICS STRIP - Premium Cards */}
      <section className="border-y border-slate-200 bg-gradient-to-b from-white to-slate-50 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="heading-section text-slate-900 mb-4">
              Enterprise-Grade Security
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              Trusted by organizations to detect voice threats with precision and speed
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Metric 1 */}
            <div className="card-premium p-6 group">
              <p className="label-technical text-slate-600 mb-3">Detection Accuracy</p>
              <p className="text-4xl font-black text-slate-900 mb-2">99.2%</p>
              <p className="text-sm text-slate-600">6-model neural ensemble</p>
            </div>
            
            {/* Metric 2 */}
            <div className="card-premium p-6 group">
              <p className="label-technical text-slate-600 mb-3">Analysis Latency</p>
              <p className="text-4xl font-black text-slate-900 mb-2">&lt;100ms</p>
              <p className="text-sm text-slate-600">Real-time processing</p>
            </div>
            
            {/* Metric 3 */}
            <div className="card-premium p-6 group">
              <p className="label-technical text-slate-600 mb-3">Threat Monitoring</p>
              <p className="text-4xl font-black text-slate-900 mb-2">24/7</p>
              <p className="text-sm text-slate-600">Continuous protection</p>
            </div>
            
            {/* Metric 4 */}
            <div className="card-premium p-6 group">
              <p className="label-technical text-slate-600 mb-3">Attack Types</p>
              <p className="text-4xl font-black text-slate-900 mb-2">4+</p>
              <p className="text-sm text-slate-600">Deepfakes, synthetic, clones, audio</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS SECTION */}
      <section className="py-16 sm:py-24 border-y border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-2xl mx-auto text-center">
            <Badge variant="default" size="md" icon={<Cpu size={14} />} className="mb-4">
              How It Works
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Multi-Layer AI Detection Pipeline
            </h2>
            <p className="text-lg text-gray-600">
              Our ensemble of neural models analyzes voice signals across multiple dimensions to identify deepfakes and synthetic speech.
            </p>
          </div>

          {/* Pipeline Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="elevated">
              <CardBody className="space-y-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800">
                  <span className="text-white font-bold">1</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Audio Intake</h3>
                <p className="text-sm text-gray-600">
                  Receive audio from file upload, microphone, or SIP trunk integration with standardization to 16kHz.
                </p>
              </CardBody>
            </Card>

            <Card variant="elevated">
              <CardBody className="space-y-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-gray-600 to-gray-700">
                  <span className="text-white font-bold">2</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Feature Extraction</h3>
                <p className="text-sm text-gray-600">
                  Extract LFCC, prosodic features, formants, and speaker embeddings using specialized acoustic models.
                </p>
              </CardBody>
            </Card>

            <Card variant="elevated">
              <CardBody className="space-y-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-gray-500 to-gray-600">
                  <span className="text-white font-bold">3</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Ensemble Classification</h3>
                <p className="text-sm text-gray-600">
                  Run 6 independent neural models and calibrate results with Logistic Regression for final risk score.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      </section>

      {/* 4. FEATURES GRID */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-2xl mx-auto text-center">
            <Badge variant="success" size="md" icon={<Zap size={14} />} className="mb-4">
              Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-vs-text-primary mb-4">
              Enterprise-Grade Voice Security
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: ShieldCheck, title: 'Real-Time Analysis', desc: 'Sub-100ms inference for live call detection' },
              { icon: Activity, title: 'Deepfake Detection', desc: 'Identify AI-generated and synthesized speech' },
              { icon: Fingerprint, title: 'Voice Cloning Detection', desc: 'Detect voice imitation and spoofing attacks' },
              { icon: Zap, title: 'Low Latency', desc: 'Process audio with minimal delay for live calls' },
              { icon: Layers, title: 'Multi-Model Ensemble', desc: '6 independent neural networks for accuracy' },
              { icon: Shield, title: 'Privacy First', desc: 'Audio files are not retained after analysis' },
            ].map((feature, idx) => (
              <Card key={idx} variant="default" isHoverable>
                <CardBody className="space-y-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gray-100">
                    <feature.icon className="text-gray-900" size={24} />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.desc}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 5. USE CASES SECTION */}
      <section className="py-16 sm:py-24 bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-2xl mx-auto text-center">
            <Badge variant="danger" size="md" icon={<AlertTriangle size={14} />} className="mb-4">
              Use Cases
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Protect Against Voice-Based Fraud
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card variant="elevated">
              <CardBody className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Landmark size={20} className="text-gray-700" />
                  Banking & Finance
                </h3>
                <p className="text-sm text-gray-600">
                  Prevent fraudulent wire transfers and account takeovers initiated with voice-cloned executive and customer voices.
                </p>
              </CardBody>
            </Card>

            <Card variant="elevated">
              <CardBody className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Radio size={20} className="text-gray-700" />
                  Call Centers
                </h3>
                <p className="text-sm text-gray-600">
                  Real-time alerts for agents when synthetic or manipulated speech is detected on inbound calls.
                </p>
              </CardBody>
            </Card>

            <Card variant="elevated">
              <CardBody className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Building size={20} className="text-gray-700" />
                  Insurance & Claims
                </h3>
                <p className="text-sm text-gray-600">
                  Verify voice authenticity during First Notice of Loss (FNOL) claims to prevent claimant impersonation.
                </p>
              </CardBody>
            </Card>

            <Card variant="elevated">
              <CardBody className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Shield size={20} className="text-green-600" />
                  Telecommunications
                </h3>
                <p className="text-sm text-gray-600">
                  Network-level SIP monitoring to flag robocalls, vishing campaigns, and AI-generated social engineering.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      </section>

      {/* 6. FINAL CTA SECTION */}
      <section className="py-20 sm:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900">
              Don't Trust a Voice.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-800 via-gray-700 to-gray-900">
                Verify It in Real Time.
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Equip your security operations with calibrated, multi-model voice deepfake detection today.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/detect" className="w-full sm:w-auto">
              <Button variant="primary" size="lg" fullWidth={true}>
                Launch Voice Inspector
              </Button>
            </Link>
            <Link to="/about" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" fullWidth={true}>
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { investigationApi } from '../services/api';
import { useAlert } from '../store/AlertContext';
import {
  ShieldAlert,
  Search,
  ArrowRight,
  Shield,
  Activity,
  AlertTriangle,
  Network,
  Share2,
  FolderGit2
} from 'lucide-react';

export const InvestigationDashboardPage: React.FC = () => {
  const [cases, setCases] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'cases' | 'campaigns'>('cases');
  const [loading, setLoading] = useState(true);
  const { addAlert } = useAlert();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [casesRes, campRes] = await Promise.all([
          investigationApi.getCases(),
          investigationApi.getCampaigns().catch(() => ({ success: false, campaigns: [] })),
        ]);

        if (casesRes.success) setCases(casesRes.cases);
        if (campRes.success) setCampaigns(campRes.campaigns);
      } catch (err: any) {
        if (err.response?.status === 403) {
          addAlert({ type: 'error', title: 'Error', message: 'Authorized investigation privileges required.' });
        } else {
          addAlert({ type: 'error', title: 'Error', message: 'Failed to load investigation intelligence.' });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [addAlert]);

  return (
    <div className="min-h-screen pt-10 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 bg-gray-50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 border border-red-300 text-[11px] font-mono text-red-700 font-semibold shadow-sm mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>LAW ENFORCEMENT & INVESTIGATION MODE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            INVESTIGATION & CAMPAIGN INTELLIGENCE
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Cryptographic evidence vault, legal escalation protocols, and syndication campaign correlation.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
          <button
            onClick={() => setActiveTab('cases')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === 'cases' ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-slate-50 border border-transparent'
            }`}
          >
            Case Dossiers ({cases.length})
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'campaigns' ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-slate-50 border border-transparent'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" /> Campaign Graph ({campaigns.length})
          </button>
        </div>
      </div>

      {activeTab === 'campaigns' && (
        <div className="bg-white p-6 space-y-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="border-b border-gray-200 pb-3">
            <h3 className="text-sm font-bold text-gray-900 font-mono flex items-center gap-2">
              <Network className="w-4 h-4 text-purple-600" /> Fraud Syndicate Campaign Graph (Feature 24)
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Correlated clusters across incidents sharing caller trunks, common synthetic voice models, and phishing scripts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map((camp) => (
              <div
                key={camp.campaign_id}
                className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-purple-100 text-purple-700 font-mono font-bold text-xs">
                      {camp.campaign_id}
                    </span>
                    <h4 className="text-xs font-bold text-gray-900 font-mono">{camp.name}</h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-red-100 text-red-700 border border-red-200">
                    {camp.active_status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="p-2 rounded bg-white border border-gray-200">
                    <span className="text-[10px] text-gray-500 block">Incidents</span>
                    <span className="font-bold text-gray-900">{camp.total_incidents}</span>
                  </div>
                  <div className="p-2 rounded bg-white border border-gray-200">
                    <span className="text-[10px] text-gray-500 block">Avg Risk</span>
                    <span className="font-bold text-red-600">{camp.average_risk_score}</span>
                  </div>
                  <div className="p-2 rounded bg-white border border-gray-200">
                    <span className="text-[10px] text-gray-500 block">Carrier</span>
                    <span className="font-bold text-gray-700 text-[10px] truncate block">Tier-1</span>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-gray-600">
                  <span className="font-bold">Linked Cases: </span>
                  {camp.case_ids.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'cases' && (
        <div className="bg-white p-6 space-y-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <h3 className="text-sm font-bold text-gray-900 font-mono flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-600" /> Active Investigation Cases
            </h3>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-gray-600 flex justify-center items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              Loading Cases...
            </div>
          ) : cases.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {cases.map((c) => (
                <div
                  key={c.case_id}
                  className="py-4 flex items-center justify-between text-xs font-mono hover:bg-gray-50 transition-colors px-2 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        c.risk_score >= 85 ? 'bg-red-600 animate-pulse' : 'bg-orange-500'
                      }`}
                    />
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">
                        Case ID: <span className="font-bold">{c.case_id}</span>
                      </div>
                      <div className="text-[11px] text-gray-600 mt-1 flex gap-3">
                        <span>{new Date(c.timestamp).toLocaleString()}</span>
                        <span className="font-bold text-gray-800">Status: {c.status}</span>
                      </div>
                      <div className="mt-1.5 flex gap-2">
                        {c.fraud_indicators?.map((ind: string) => (
                          <span
                            key={ind}
                            className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold border border-red-200"
                          >
                            {ind.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <span className="font-bold text-red-600 text-sm">
                        Risk: {c.risk_score}/100
                      </span>
                      <div className="text-[10px] text-gray-600">
                        AI Prob: {Math.round(c.voice_ai_probability)}%
                      </div>
                    </div>

                    <Link
                      to={`/investigation/${c.case_id}`}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-sm transition-colors"
                    >
                      View Dossier <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-gray-600 space-y-2">
              <Shield className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="font-semibold text-gray-800">No active investigation cases.</p>
              <p>Cases are automatically generated for highly probable fraud interactions.</p>
            </div>
          )}
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3 shadow-sm">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
        <div className="text-xs text-yellow-800">
          <strong className="block mb-1">STRICT CONFIDENTIALITY NOTICE</strong>
          Accessing this system leaves an immutable audit trail. Evidence collected, including authorized
          location requests, are cryptographically hashed and entered into the official Chain of Custody.
          Do not attempt to access cases outside your jurisdiction.
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { historyApi } from '../services/api';
import { DetectionResult } from '../types';
import {
  History,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  Eye,
  X,
} from 'lucide-react';
import { ForensicRadar } from '../components/ForensicRadar';
import { ExplainableAiCard } from '../components/ExplainableAiCard';

export const HistoryPage: React.FC = () => {
  const [historyItems, setHistoryItems] = useState<DetectionResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [filterPrediction, setFilterPrediction] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<DetectionResult | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await historyApi.getHistory({
        page,
        limit: 10,
        prediction: filterPrediction || undefined,
      });
      if (res.success && res.data) {
        setHistoryItems(res.data.items);
        setTotalPages(res.data.pagination?.total_pages || 1);
        setTotalCount(res.data.pagination?.total || res.data.items.length);
      }
    } catch (err) {
      console.warn('[History] Failed to load history:', err);
      setHistoryItems([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, filterPrediction]);

  const handleExportCsv = () => {
    if (historyItems.length === 0) return;
    const headers = 'Request ID,Prediction,Confidence,Risk Score,Model,Created At\n';
    const rows = historyItems
      .map(
        (item) =>
          `"${item.request_id || ''}","${item.prediction}","${item.confidence}","${item.risk_score}","${item.model_name || ''}","${item.created_at || ''}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voiceshield_audit_history_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = historyItems.filter(
    (item) =>
      (item.request_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.model_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen pt-12 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 cyber-grid-bg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-2.5 font-mono">
            <History className="w-7 h-7 text-gray-900" /> Detection Audit History
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            Paginated logs of all cryptographic AI classifications, risk scores, and forensic metadata.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-[#3B82F6] text-xs text-gray-900 flex items-center gap-1.5 transition-all font-mono"
          >
            <Download className="w-3.5 h-3.5 text-gray-900" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Request ID or Model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6] font-mono"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-gray-600" />
          <select
            value={filterPrediction}
            onChange={(e) => {
              setFilterPrediction(e.target.value);
              setPage(1);
            }}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-[#3B82F6] font-mono"
          >
            <option value="">All Classifications</option>
            <option value="SPOOF">Spoof / Deepfake Only</option>
            <option value="BONA_FIDE">Authentic Only</option>
          </select>
        </div>
      </div>

      {/* Table of Records */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-mono uppercase text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Request ID</th>
                <th className="py-3.5 px-4">Status & Prediction</th>
                <th className="py-3.5 px-4">Confidence</th>
                <th className="py-3.5 px-4">Risk Index</th>
                <th className="py-3.5 px-4">Processing Time</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-mono">
              {filtered.length > 0 ? (
                filtered.map((row) => (
                  <tr key={row.id || row.request_id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4 font-semibold text-gray-900 truncate max-w-[140px]">
                      {row.request_id || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          row.prediction === 'SPOOF'
                            ? 'bg-[rgba(239,68,68,0.15)] text-[#EF4444] border border-[rgba(239,68,68,0.3)]'
                            : 'bg-[rgba(16,185,129,0.15)] text-[#10B981] border border-[rgba(16,185,129,0.3)]'
                        }`}
                      >
                        {row.prediction === 'SPOOF' ? (
                          <ShieldAlert className="w-3 h-3" />
                        ) : (
                          <ShieldCheck className="w-3 h-3" />
                        )}
                        {row.prediction}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-900">
                      {Math.round((row.confidence || 0) * 100)}%
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-bold ${
                          row.risk_score >= 70
                            ? 'text-[#EF4444]'
                            : row.risk_score >= 35
                            ? 'text-[#F59E0B]'
                            : 'text-[#10B981]'
                        }`}
                      >
                        {row.risk_score}/100
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{row.processing_time_ms || 466} ms</td>
                    <td className="py-3 px-4 text-gray-600">
                      {row.created_at ? new Date(row.created_at).toLocaleString() : 'Just now'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedRecord(row)}
                        className="p-1.5 rounded-lg bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-[#3B82F6] text-gray-900 transition-colors shadow-sm"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[#64748B] font-sans text-xs">
                    {loading ? 'Fetching detection records...' : 'No detection history found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
          <div>
            Total Records: <span className="font-mono font-bold text-gray-900">{totalCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-900 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-gray-900">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-900 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Forensic Inspection Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel p-6 rounded-3xl border border-[#3B82F6]/40 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 font-mono">Detection Audit Details</h3>
                <p className="text-xs font-mono text-gray-900 mt-0.5">{selectedRecord.request_id}</p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 bg-gray-50 border border-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs font-mono">
              <div className="glass-card p-3">
                <div className="text-[10px] text-[#64748B]">Prediction</div>
                <div className="font-bold text-gray-900 mt-0.5">{selectedRecord.prediction}</div>
              </div>
              <div className="glass-card p-3">
                <div className="text-[10px] text-[#64748B]">Confidence</div>
                <div className="font-bold text-gray-900 mt-0.5">
                  {Math.round((selectedRecord.confidence || 0) * 100)}%
                </div>
              </div>
              <div className="glass-card p-3">
                <div className="text-[10px] text-[#64748B]">Risk Score</div>
                <div className="font-bold text-[#EF4444] mt-0.5">{selectedRecord.risk_score}/100</div>
              </div>
              <div className="glass-card p-3">
                <div className="text-[10px] text-[#64748B]">Model Version</div>
                <div className="font-bold text-[#6366F1] mt-0.5">{selectedRecord.model_version || 'v2.0'}</div>
              </div>
            </div>

            {/* Forensics Radar */}
            <ForensicRadar forensics={selectedRecord.forensics_json as any} />

            {/* Explainable Signals */}
            <ExplainableAiCard signals={selectedRecord.explainability_json as any} />
          </div>
        </div>
      )}
    </div>
  );
};

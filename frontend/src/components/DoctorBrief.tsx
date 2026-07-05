import { useState } from 'react';
import {
  Stethoscope,
  FileText,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Quote,
  AlertCircle,
  Clock,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateDoctorBrief } from '../api/client';
import type { DoctorBriefResponse, Citation } from '../types';

interface Props {
  patientId: string;
  patientName: string;
}

export default function DoctorBrief({ patientId, patientName }: Props) {
  const [brief, setBrief] = useState<DoctorBriefResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCitations, setShowCitations] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateDoctorBrief(patientId);
      setBrief(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate brief');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Doctor Brief
          </h2>
          <p className="text-sm text-gray-500">
            Pre-visit summary for <span className="font-medium text-gray-700">{patientName}</span>
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors text-sm font-medium"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          {loading ? 'Generating...' : 'Generate Brief'}
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!brief && !loading && !error && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
              <Stethoscope className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Generate a Pre-Visit Brief
            </h3>
            <p className="text-sm text-gray-500 max-w-md mb-6">
              Create a comprehensive clinical summary from the patient's stored
              health memory. The brief includes symptom progression, medication
              history, mood trends, and supporting citations from the knowledge graph.
            </p>
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium transition-colors"
            >
              <FileText className="w-4 h-4" />
              Generate Brief
            </button>
          </div>
        )}

        {error && (
          <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">
                Error generating brief
              </p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 text-primary-500 animate-spin mb-4" />
            <p className="text-sm text-gray-500">
              Querying knowledge graph and synthesizing brief...
            </p>
            <p className="text-xs text-gray-400 mt-1">
              This may take a moment as Cognee retrieves and connects relevant memories
            </p>
          </div>
        )}

        {brief && !loading && (
          <div className="p-6 space-y-6">
            {/* Brief metadata */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {new Date(brief.generated_at).toLocaleString()}
              </div>
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                {brief.memory_count} memories referenced
              </div>
            </div>

            {/* Brief content */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900">
                <ReactMarkdown>{brief.brief}</ReactMarkdown>
              </div>
            </div>

            {/* Citations */}
            {brief.citations.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => setShowCitations(!showCitations)}
                  className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Quote className="w-4 h-4 text-primary-500" />
                    <span className="text-sm font-medium text-gray-900">
                      Citations & Evidence
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {brief.citations.length}
                    </span>
                  </div>
                  {showCitations ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {showCitations && (
                  <div className="border-t border-gray-100 divide-y divide-gray-100">
                    {brief.citations.map((cit, i) => (
                      <CitationCard key={i} citation={cit} index={i + 1} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


function CitationCard({ citation, index }: { citation: Citation; index: number }) {
  return (
    <div className="px-5 py-3.5 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-medium">
          {index}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">{citation.claim}</p>
          <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
            {citation.source_memory}
          </p>
        </div>
      </div>
    </div>
  );
}

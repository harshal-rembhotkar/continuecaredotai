import { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  RefreshCw,
  Trash2,
  Sparkles,
  Network,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  getMemoryGraph,
  getMemoryInventory,
  improveMemory,
  forgetMemory,
} from '../api/client';
import type { MemoryGraph, MemoryInventory, MemoryNode } from '../types';
import KnowledgeGraph from './KnowledgeGraph';

type Tab = 'graph' | 'inventory';

interface Props {
  patientId?: string;
  patientName?: string;
  readOnly?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  symptom: '#ef4444',
  medication: '#3b82f6',
  mood: '#a855f7',
  observation: '#22c55e',
  health_record: '#f59e0b',
};

export default function MemoryExplorer({ patientId, patientName, readOnly = false }: Props) {
  const [tab, setTab] = useState<Tab>('graph');
  const [graph, setGraph] = useState<MemoryGraph>({ nodes: [], edges: [] });
  const [inventory, setInventory] = useState<MemoryInventory>({ inventory: [], total_entities: 0 });
  const [loading, setLoading] = useState(false);
  const [improving, setImproving] = useState(false);
  const [showForgetDialog, setShowForgetDialog] = useState(false);
  const [forgetting, setForgetting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedNode, setSelectedNode] = useState<MemoryNode | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [g, inv] = await Promise.all([
        getMemoryGraph(patientId),
        getMemoryInventory(patientId),
      ]);
      setGraph(g);
      setInventory(inv);
    } catch (err) {
      console.error('Failed to load memory data:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { refresh(); }, [refresh]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleImprove = async () => {
    setImproving(true);
    try {
      const result = await improveMemory(patientId);
      showNotification('success', result.message);
      await refresh();
    } catch (err) {
      showNotification('error', 'Failed to improve memory');
    } finally {
      setImproving(false);
    }
  };

  const handleForget = async () => {
    setForgetting(true);
    try {
      await forgetMemory(patientId);
      showNotification('success', 'Memory has been cleared for this patient.');
      setShowForgetDialog(false);
      setSelectedNode(null);
      await refresh();
    } catch (err) {
      showNotification('error', 'Failed to forget memory');
    } finally {
      setForgetting(false);
    }
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* Notification toast */}
      {notification && (
        <div
          className={`absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border animate-fade-in ${
            notification.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          <p className="text-sm">{notification.message}</p>
          <button onClick={() => setNotification(null)} className="ml-2 opacity-60 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Memory Explorer
            </h2>
            <p className="text-sm text-gray-500">
              {patientName
                ? <>Knowledge graph for <span className="font-medium text-gray-700">{patientName}</span></>
                : 'Visualize and manage your health memory'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {!readOnly && (
              <>
            <button
              onClick={handleImprove}
              disabled={improving}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 disabled:opacity-50 transition-colors"
            >
              {improving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {improving ? 'Improving...' : 'Improve Memory'}
            </button>
            <button
              onClick={() => setShowForgetDialog(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear Memory
            </button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          <button
            onClick={() => setTab('graph')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === 'graph'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Network className="w-4 h-4" />
            Knowledge Graph
          </button>
          <button
            onClick={() => setTab('inventory')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === 'inventory'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Memory Inventory
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          {tab === 'graph' && (
            <div className="h-full">
              {graph.nodes.length === 0 && !loading ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Brain className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">
                    No memories stored yet. Start a conversation with the Patient Companion.
                  </p>
                </div>
              ) : (
                <KnowledgeGraph
                  graph={graph}
                  onNodeClick={setSelectedNode}
                  typeColors={TYPE_COLORS}
                />
              )}

              {/* Legend */}
              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg p-3 shadow-sm">
                <p className="text-xs font-medium text-gray-700 mb-2">Entity Types</p>
                <div className="space-y-1.5">
                  {Object.entries(TYPE_COLORS).map(([type, color]) => (
                    <div key={type} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-xs text-gray-600 capitalize">{type.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'inventory' && (
            <div className="p-6 overflow-y-auto h-full">
              <div className="max-w-3xl">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-2xl font-bold text-gray-900">
                      {inventory.total_entities}
                    </p>
                    <p className="text-sm text-gray-500">Total Entities</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-2xl font-bold text-gray-900">
                      {inventory.inventory.length}
                    </p>
                    <p className="text-sm text-gray-500">Entity Types</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-2xl font-bold text-gray-900">
                      {graph.edges.length}
                    </p>
                    <p className="text-sm text-gray-500">Relationships</p>
                  </div>
                </div>

                {/* Inventory list */}
                {inventory.inventory.length === 0 ? (
                  <div className="text-center py-12">
                    <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      No entities in memory. Start recording health information.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {inventory.inventory.map((item, i) => (
                      <div
                        key={i}
                        className="bg-white rounded-xl border border-gray-200 p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor:
                                  TYPE_COLORS[item.type.toLowerCase()] ?? '#6b7280',
                              }}
                            />
                            <h4 className="text-sm font-medium text-gray-900 capitalize">
                              {item.type}
                            </h4>
                          </div>
                          <span className="text-sm text-gray-500">
                            {item.count} {item.count === 1 ? 'entity' : 'entities'}
                          </span>
                        </div>
                        {item.sample_names.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {item.sample_names.slice(0, 8).map((name, j) => (
                              <span
                                key={j}
                                className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.relationships.length > 0 && (
                          <div className="mt-2 text-xs text-gray-400">
                            Relationships: {item.relationships.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Node detail panel */}
        {selectedNode && (
          <aside className="w-72 bg-white border-l border-gray-200 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-900">Node Details</h4>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Type</p>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: TYPE_COLORS[selectedNode.type] ?? '#6b7280',
                    }}
                  />
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {selectedNode.type.replace('_', ' ')}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Label</p>
                <p className="text-sm text-gray-800 mt-1">{selectedNode.label}</p>
              </div>
              {selectedNode.properties['full_text'] != null && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Full Content
                  </p>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed bg-gray-50 p-2 rounded">
                    {String(selectedNode.properties.full_text)}
                  </p>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Forget confirmation dialog */}
      {showForgetDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Forget All Memory?
                </h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              This will permanently remove all patient memories from the knowledge graph.
              After deletion, the system will no longer remember any symptoms,
              medications, mood entries, or observations. Recalled information
              will no longer include any forgotten data.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowForgetDialog(false)}
                disabled={forgetting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleForget()}
                disabled={forgetting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {forgetting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {forgetting ? 'Forgetting...' : 'Forget Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

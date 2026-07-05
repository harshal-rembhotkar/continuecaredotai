import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Pill,
  Thermometer,
  Heart,
  Eye,
  BookOpen,
  ChevronRight,
} from 'lucide-react';
import { sendPatientMessage } from '../api/client';
import type { ChatMessage, MemoryEvidence, EntityInfo } from '../types';

const QUICK_PROMPTS = [
  { icon: Thermometer, label: 'Log symptom', prompt: "I've been experiencing " },
  { icon: Pill, label: 'Log medication', prompt: "I started taking " },
  { icon: Heart, label: 'Log mood', prompt: "I've been feeling " },
  { icon: Eye, label: 'Log observation', prompt: "I noticed that " },
  { icon: BookOpen, label: 'Ask history', prompt: "What do you remember about my " },
];

export default function PatientCompanion() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedMemories, setSelectedMemories] = useState<MemoryEvidence[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  const handleSend = async (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'patient',
      content: msg,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await sendPatientMessage(msg);

      const botMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'companion',
        content: res.response,
        timestamp: new Date(),
        memories: res.memories_used,
        entities: res.entities_extracted,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'companion',
        content: `I encountered an issue processing your message. Please try again. (${err instanceof Error ? err.message : 'Unknown error'})`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex h-full">
      {/* Chat panel */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="px-6 py-4 bg-white border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Patient Companion
          </h2>
          <p className="text-sm text-gray-500">
            Record symptoms, medications, mood, and ask about your health history
          </p>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mb-4">
                <Heart className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Welcome to your Health Companion
              </h3>
              <p className="text-sm text-gray-500 max-w-md mb-8">
                I remember your health history and help you track symptoms,
                medications, and mood over time. Your information is stored
                in a knowledge graph that grows smarter with each conversation.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {QUICK_PROMPTS.map(({ icon: Icon, label, prompt }) => (
                  <button
                    key={label}
                    onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:border-primary-300 hover:text-primary-700 transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onShowMemories={(m) => setSelectedMemories(m)}
            />
          ))}

          {loading && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <Heart className="w-4 h-4 text-primary-600" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1.5 text-primary-400">
                  <span className="thinking-dot" />
                  <span className="thinking-dot" />
                  <span className="thinking-dot" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-6 py-4 bg-white border-t border-gray-200">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex gap-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe symptoms, medications, mood, or ask a question..."
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Memory sidebar */}
      <aside className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">
            Supporting Memories
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Evidence used to generate responses
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {selectedMemories.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">
                Click a response to see the memories that informed it
              </p>
            </div>
          ) : (
            selectedMemories.map((mem, i) => (
              <div
                key={i}
                className="p-3 bg-gray-50 rounded-lg border border-gray-100 animate-fade-in"
              >
                <p className="text-xs text-gray-700 leading-relaxed">
                  {mem.content}
                </p>
                {mem.source && (
                  <p className="text-[11px] text-gray-400 mt-2">
                    Source: {mem.source}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}


function MessageBubble({
  message,
  onShowMemories,
}: {
  message: ChatMessage;
  onShowMemories: (m: MemoryEvidence[]) => void;
}) {
  const isPatient = message.role === 'patient';

  return (
    <div
      className={`flex gap-3 animate-fade-in ${isPatient ? 'flex-row-reverse' : ''}`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isPatient ? 'bg-gray-200' : 'bg-primary-100'
        }`}
      >
        {isPatient ? (
          <span className="text-xs font-medium text-gray-600">You</span>
        ) : (
          <Heart className="w-4 h-4 text-primary-600" />
        )}
      </div>

      <div className={`max-w-[75%] space-y-2 ${isPatient ? 'items-end' : ''}`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isPatient
              ? 'bg-primary-600 text-white rounded-tr-sm'
              : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm cursor-pointer hover:border-primary-200 transition-colors'
          }`}
          onClick={() => {
            if (!isPatient && message.memories?.length) {
              onShowMemories(message.memories);
            }
          }}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Entity tags */}
        {!isPatient && message.entities && message.entities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.entities.map((e, i) => (
              <EntityTag key={i} entity={e} />
            ))}
          </div>
        )}

        {/* "View memories" hint */}
        {!isPatient && message.memories && message.memories.length > 0 && (
          <button
            onClick={() => onShowMemories(message.memories!)}
            className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-700 transition-colors"
          >
            <BookOpen className="w-3 h-3" />
            {message.memories.length} supporting{' '}
            {message.memories.length === 1 ? 'memory' : 'memories'}
            <ChevronRight className="w-3 h-3" />
          </button>
        )}

        <p className="text-[11px] text-gray-400">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}


function EntityTag({ entity }: { entity: EntityInfo }) {
  const tagClass = `entity-tag-${entity.type}`;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${tagClass}`}
    >
      {entity.name || entity.type}
    </span>
  );
}

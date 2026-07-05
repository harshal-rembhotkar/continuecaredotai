import { useState, useEffect } from 'react';
import {
  MessageCircle,
  Stethoscope,
  Brain,
  Activity,
  Users,
  LogOut,
} from 'lucide-react';
import AuthPage from './components/AuthPage';
import PatientCompanion from './components/PatientCompanion';
import DoctorBrief from './components/DoctorBrief';
import MemoryExplorer from './components/MemoryExplorer';
import PatientList from './components/PatientList';
import type { AuthState, PatientSummary, ViewMode } from './types';

const PATIENT_NAV: { id: ViewMode; label: string; icon: typeof MessageCircle }[] = [
  { id: 'companion', label: 'My Health Companion', icon: MessageCircle },
  { id: 'memory', label: 'My Memory', icon: Brain },
];

const DOCTOR_NAV: { id: ViewMode; label: string; icon: typeof MessageCircle }[] = [
  { id: 'patients', label: 'Patients', icon: Users },
  { id: 'doctor', label: 'Doctor Brief', icon: Stethoscope },
  { id: 'memory', label: 'Memory Explorer', icon: Brain },
];

function loadAuth(): AuthState | null {
  const raw = localStorage.getItem('auth');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    return null;
  }
}

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>(loadAuth);
  const [view, setView] = useState<ViewMode>('companion');
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);

  const isDoctor = auth?.user.role === 'doctor';
  const navItems = isDoctor ? DOCTOR_NAV : PATIENT_NAV;

  useEffect(() => {
    if (!auth) return;
    setView(auth.user.role === 'doctor' ? 'patients' : 'companion');
  }, [auth?.user.id]);

  const handleLogout = () => {
    localStorage.removeItem('auth');
    setAuth(null);
    setSelectedPatient(null);
  };

  const handleSelectPatient = (patient: PatientSummary) => {
    setSelectedPatient(patient);
    setView('doctor');
  };

  if (!auth) {
    return <AuthPage onAuth={setAuth} />;
  }

  const needsPatient = isDoctor && (view === 'doctor' || view === 'memory');

  return (
    <div className="flex h-screen bg-gray-50">
      <nav className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">ContinueCare</h1>
              <p className="text-xs text-gray-500">.ai</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 truncate">{auth.user.name}</p>
          <p className="text-xs text-gray-500 truncate">{auth.user.email}</p>
          <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary-50 text-primary-700 capitalize">
            {auth.user.role}
            {auth.user.specialization ? ` · ${auth.user.specialization}` : ''}
          </span>
        </div>

        {isDoctor && selectedPatient && (
          <div className="px-4 py-3 border-b border-gray-100 bg-blue-50/50">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">
              Selected patient
            </p>
            <p className="text-sm font-medium text-gray-900 truncate">
              {selectedPatient.name}
            </p>
            <button
              onClick={() => { setSelectedPatient(null); setView('patients'); }}
              className="text-xs text-primary-600 hover:text-primary-800 mt-1"
            >
              Change patient
            </button>
          </div>
        )}

        <div className="flex-1 p-3 space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                view === id
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </nav>

      <main className="flex-1 overflow-hidden">
        {!isDoctor && view === 'companion' && <PatientCompanion />}
        {!isDoctor && view === 'memory' && <MemoryExplorer />}

        {isDoctor && view === 'patients' && (
          <PatientList onSelectPatient={handleSelectPatient} />
        )}
        {isDoctor && view === 'doctor' && (
          needsPatient && !selectedPatient ? (
            <SelectPatientPrompt onGoToPatients={() => setView('patients')} />
          ) : (
            <DoctorBrief
              patientId={selectedPatient!.id}
              patientName={selectedPatient!.name}
            />
          )
        )}
        {isDoctor && view === 'memory' && (
          needsPatient && !selectedPatient ? (
            <SelectPatientPrompt onGoToPatients={() => setView('patients')} />
          ) : (
            <MemoryExplorer
              patientId={selectedPatient!.id}
              patientName={selectedPatient!.name}
              readOnly
            />
          )
        )}
      </main>
    </div>
  );
}

function SelectPatientPrompt({ onGoToPatients }: { onGoToPatients: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <Users className="w-12 h-12 text-gray-300 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Select a patient first</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-6">
        Choose a registered patient from the Patients list to view their brief or memory graph.
      </p>
      <button
        onClick={onGoToPatients}
        className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
      >
        Go to Patients
      </button>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Activity, UserPlus, LogIn, Stethoscope, Heart, Building2 } from 'lucide-react';
import { register, login, getHospitalDoctors } from '../api/client';
import type { AuthState, HospitalDoctor } from '../types';

interface Props {
  onAuth: (auth: AuthState) => void;
}

type AuthTab = 'patient-login' | 'patient-register' | 'doctor-login';

export default function AuthPage({ onAuth }: Props) {
  const [tab, setTab] = useState<AuthTab>('patient-login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<HospitalDoctor[]>([]);

  useEffect(() => {
    getHospitalDoctors()
      .then((res) => setDoctors(res.doctors))
      .catch(() => setDoctors([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result: AuthState;
      if (tab === 'patient-register') {
        result = await register(name, email, password);
      } else {
        result = await login(email, password);
      }
      localStorage.setItem('auth', JSON.stringify(result));
      onAuth(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      if (msg.includes('409')) setError('Email already registered. Please log in.');
      else if (msg.includes('401')) setError('Invalid email or password.');
      else if (msg.includes('403')) setError('Doctor accounts are hospital-provisioned only.');
      else if (msg.includes('400')) setError('Hospital emails cannot register as patients.');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectDoctor = (doc: HospitalDoctor) => {
    setEmail(doc.email);
    setTab('doctor-login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600 mb-4">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ContinueCare.ai</h1>
          <p className="text-sm text-gray-500 mt-1">Hospital health memory platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            <button
              type="button"
              onClick={() => setTab('patient-login')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                tab === 'patient-login'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Patient Login
            </button>
            <button
              type="button"
              onClick={() => setTab('patient-register')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                tab === 'patient-register'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Register
            </button>
            <button
              type="button"
              onClick={() => setTab('doctor-login')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                tab === 'doctor-login'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              Staff Login
            </button>
          </div>

          {tab === 'doctor-login' && (
            <div className="mb-5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <p className="text-xs font-medium text-blue-900">ContinueCare Hospital Staff</p>
              </div>
              <p className="text-xs text-blue-700 mb-2">
                Only provisioned doctors with <strong>@continuecare.com</strong> may log in.
              </p>
              <div className="space-y-1">
                {doctors.map((doc) => (
                  <button
                    key={doc.email}
                    type="button"
                    onClick={() => selectDoctor(doc)}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-blue-100/80 transition-colors"
                  >
                    <p className="text-xs font-medium text-gray-900">{doc.name}</p>
                    <p className="text-[11px] text-gray-500">
                      {doc.specialization} · {doc.email}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'patient-register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="John Doe"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={
                  tab === 'doctor-login' ? 'name@continuecare.com' : 'you@email.com'
                }
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {tab === 'patient-register' ? (
                <>
                  <Heart className="w-4 h-4" />
                  {loading ? 'Please wait...' : 'Register as Patient'}
                </>
              ) : tab === 'doctor-login' ? (
                <>
                  <Stethoscope className="w-4 h-4" />
                  {loading ? 'Please wait...' : 'Staff Login'}
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  {loading ? 'Please wait...' : 'Patient Login'}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

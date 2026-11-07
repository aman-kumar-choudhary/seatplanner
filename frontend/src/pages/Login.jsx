import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Login = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/admin/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Username and password are required.');
      return;
    }

    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid username or password.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 bg-[#F5F7FA] text-[#1F2937]">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm text-center">
        <h2 className="text-xl font-semibold text-[#0F2747] tracking-tight">
          Seat Management Portal
        </h2>
        <p className="mt-1 text-xs text-[#667085]">
          Sign in to access administrator controls
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="bg-white py-6 px-6 border border-[#D9DEE7] rounded shadow-none">
          {error && (
            <div className="mb-4 p-2.5 bg-[#FBEAE8] border border-[#E5B2AD] rounded text-xs text-[#C0392B]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[#1F2937] mb-1">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full px-3 py-2 bg-white border border-[#D9DEE7] rounded text-[#1F2937] focus:outline-none focus:border-[#0F2747]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1F2937] mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-3 py-2 bg-white border border-[#D9DEE7] rounded text-[#1F2937] focus:outline-none focus:border-[#0F2747]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-[#0F2747] hover:bg-[#0A1C33] text-white text-xs font-semibold rounded transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-[#D9DEE7] text-center text-[11px] text-[#667085] space-y-2">
            <div>Default credentials: <strong className="font-mono">admin</strong> / <strong className="font-mono">admin123</strong></div>
            <div>
              <Link to="/" className="text-[#0F2747] hover:underline">
                ← View Public Seat Map
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Input, Card, Checkbox } from '@/components/ui';
import { useAuthStore, useSyncStore, useToast } from '@/stores';
import { authAPI } from '@/services/api';
import { db } from '@/services/db';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const { deviceId, rememberMe, setRememberMe, login } = useAuthStore();
  const isOnline = useSyncStore((state) => state.isOnline);

  const [eventCode, setEventCode] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!eventCode.trim() || !password.trim()) {
      setError('Please enter both event code and password');
      return;
    }

    // Don't block on isOnline - let the API call determine connectivity
    // navigator.onLine can be unreliable on mobile devices

    setIsLoading(true);

    try {
      const response = await authAPI.login({
        event_identifier: eventCode.trim(),
        password: password,
        device_id: deviceId,
        remember_me: rememberMe,
      });

      if (response.status === 'success' && response.session_token && response.event_details) {
        login(response.session_token, response.event_details);
        toast.success('Login successful', `Welcome to ${response.event_details.event_name}`);
        
        // Check if tickets exist, if not redirect to settings
        const hasTickets = !(await db.isTableEmpty());
        if (hasTickets) {
          navigate(from, { replace: true });
        } else {
          toast.info('Setup Required', 'Please download tickets to start scanning');
          navigate('/settings', { replace: true });
        }
      } else {
        setError(response.message || 'Login failed. Please check your credentials.');
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      // Show more detailed error message
      if (err instanceof Error) {
        if (err.message.includes('Network Error') || err.message.includes('fetch')) {
          setError('Network error. Please check your internet connection and try again.');
        } else if (err.message.includes('CORS')) {
          setError('Connection blocked. Please try again or contact support.');
        } else {
          setError(`Login failed: ${err.message}`);
        }
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 p-4">
      <Card className="w-full max-w-md" padding="lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Scan</h1>
          <p className="text-gray-500 mt-1">Ticket Scanner by 263tickets</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Event Code"
            placeholder="Enter event code"
            value={eventCode}
            onChange={(e) => setEventCode(e.target.value)}
            disabled={isLoading}
            leftIcon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
            }
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            leftIcon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
          />

          <Checkbox
            checked={rememberMe}
            onChange={setRememberMe}
            label="Remember me"
          />

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 animate-shake">
              {error}
            </div>
          )}

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={isLoading}
            leftIcon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            }
          >
            Login to Event
          </Button>
        </form>

        {/* Connection Status */}
        <div className="mt-6 flex items-center justify-center gap-2 text-sm">
          <span
            className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          />
          <span className={isOnline ? 'text-emerald-600' : 'text-red-600'}>
            {isOnline ? 'Connected' : 'Offline'}
          </span>
        </div>

        {/* Device ID */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">
            Device ID: <span className="font-mono">{deviceId}</span>
          </p>
        </div>
      </Card>

      {/* Footer */}
      <p className="mt-6 text-sm text-white/70">
        © 2026 263tickets • v1.0.0
      </p>
    </div>
  );
};

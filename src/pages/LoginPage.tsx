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

  const { deviceId, gateName, setGateName, rememberMe, setRememberMe, login } = useAuthStore();
  const isOnline = useSyncStore((state) => state.isOnline);

  const [eventCode, setEventCode] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!eventCode.trim() || !password.trim()) {
      setError('Please enter both event code and password');
      return;
    }

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
      if (err instanceof Error) {
        if (err.message.includes('Network Error') || err.message.includes('fetch')) {
          setError('Network error. Please check your internet connection.');
        } else {
          setError('Login failed. Please check your credentials.');
        }
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <Card className="overflow-visible" padding="lg">
          <div className="-mt-12 mb-6 flex justify-center">
            <div className="w-24 h-24 rounded-3xl bg-secondary flex items-center justify-center shadow-lg">
              <img src="/icons/icon-192.svg" alt="263tickets" className="w-12 h-12" />
            </div>
          </div>

          <div className="text-center mb-4">
            <h1 className="text-2xl font-semibold text-text-primary">Welcome to 263tickets</h1>
            <p className="text-sm text-text-secondary mt-1">Sign in with your event credentials to begin scanning</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" aria-describedby="login-help">
            <Input
              label="Event Code"
              placeholder="e.g. MTN-FEST-2026"
              value={eventCode}
              onChange={(e) => setEventCode(e.target.value)}
              disabled={isLoading}
              autoFocus
              aria-label="Event code"
              leftIcon={
                <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
              }
            />

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                aria-label="Password"
                leftIcon={
                  <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
              />

              <div className="mt-2 flex items-center justify-between text-sm">
                <label className="inline-flex items-center gap-2">
                  <Checkbox
                    checked={rememberMe}
                    onChange={setRememberMe}
                    label="Remember me"
                  />
                </label>

                <button
                  type="button"
                  className="text-sm text-text-secondary hover:text-text-primary"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-pressed={showPassword}
                >
                  {showPassword ? 'Hide' : 'Show'} password
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">
                {error}
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={isLoading}
              className="bg-black text-white hover:bg-black/90"
              aria-label="Login to event"
            >
              Login to Event
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-text-secondary">
            <p id="login-help">Don't have event credentials? Contact your event organiser or visit the event dashboard.</p>
          </div>

          <div className="mt-6 text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs text-text-tertiary">Device ID:</span>
              <span className="text-xs font-mono text-text-secondary">{deviceId}</span>
            </div>
            
            <div className="flex items-center justify-center gap-2">
              <label htmlFor="gate-name" className="text-xs text-text-tertiary">Gate:</label>
              <input
                id="gate-name"
                type="text"
                value={gateName}
                onChange={(e) => setGateName(e.target.value)}
                placeholder="e.g. Main Entrance"
                className="text-xs px-2 py-1 border border-border rounded bg-surface text-text-primary placeholder:text-text-tertiary w-32 text-center"
                aria-label="Gate name (optional)"
              />
            </div>

            <div className="flex items-center justify-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-success' : 'bg-error'}`} />
              <span className={isOnline ? 'text-success' : 'text-error'}>
                {isOnline ? 'Connected' : 'Offline'}
              </span>
            </div>
          </div>
        </Card>

        <div className="mt-6 text-center text-sm text-text-secondary">
          <p>© 2026 263tickets • v1.0.0</p>
        </div>
      </div>
    </div>
  );
};

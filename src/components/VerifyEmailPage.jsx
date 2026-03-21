// components/VerifyEmailPage.jsx
import { useState, useEffect } from 'react';
import { getAuth, sendEmailVerification } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmailPage() {
  const auth = getAuth();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState('');

  // If not logged in → login; if pre-user → dashboard
  useEffect(() => {
    if (!currentUser) {
      navigate('/login', { replace: true });
      return;
    }

    if (currentUser.isPreUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, navigate]);

  // If already verified (live Firebase user), go straight to dashboard
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    if (user.emailVerified) {
      navigate('/dashboard', { replace: true });
    }
  }, [auth, navigate]);

  // Poll for emailVerified and redirect dynamically
  useEffect(() => {
    const interval = setInterval(async () => {
      const user = auth.currentUser;
      if (!user) return;

      await user.reload();
      if (user.emailVerified) {
        navigate('/dashboard', { replace: true });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [auth, navigate]);

  // Cooldown timer for resend button
  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleResend = async () => {
    const user = auth.currentUser;
    if (!user) {
      setMessage('Please log in again to resend the verification email.');
      return;
    }

    try {
      setMessage('');
      await sendEmailVerification(user);
      setMessage('Verification email sent. Please check your inbox.');
      setCooldown(60);
    } catch (err) {
      console.error(err);
      setMessage('Could not send verification email. Please try again later.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow p-6 text-center">
        <h1 className="text-xl font-bold mb-2">Verify your email</h1>
        <p className="text-sm text-gray-600 mb-4">
          A verification link has been sent to your email. After verifying, this page will automatically take you to your dashboard.
        </p>

        <button
          onClick={handleResend}
          disabled={cooldown > 0}
          className={`w-full py-2 px-4 rounded-lg text-sm font-semibold ${
            cooldown > 0
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {cooldown > 0
            ? `Resend available in ${cooldown}s`
            : 'Resend verification email'}
        </button>

        {message && (
          <p className="mt-3 text-xs text-gray-600">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

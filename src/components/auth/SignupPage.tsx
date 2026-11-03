import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuLoader, LuZap } from 'react-icons/lu';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../../contexts/AuthContext';

const SignupPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { signUp, loginWithGoogle, loginAsGuest, isFirebaseConfigured } = useAuth();
  const navigate = useNavigate();

  // Validate form
  const validateForm = () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('All fields are required');
      return false;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setError(null);
      setLoading(true);
      await signUp(email, password, name);
      navigate('/projects');
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle Google sign-in
  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      setLoading(true);
      await loginWithGoogle();
      navigate('/projects');
    } catch (err: any) {
      console.error('Google signup error:', err);
      setError(err.message || 'Failed to sign up with Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    loginAsGuest();
    navigate('/projects');
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#070B14] to-[#0A1428] flex flex-col items-center justify-center p-4">
      {/* Go back button */}
      <Link to="/" className="absolute top-6 left-6 flex items-center text-gray-400 hover:text-white transition-colors">
        <LuArrowLeft className="mr-2" />
        Back to Home
      </Link>
      
      {/* Signup container */}
      <div className="w-full max-w-md relative">
        {/* Glow effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-600/20 to-secondary-600/20 rounded-lg blur-md"></div>
        
        <div className="relative bg-[#0A0F1C]/90 backdrop-blur-md p-8 rounded-lg border border-gray-800/50 shadow-xl">
          <h2 className="text-2xl font-bold text-center mb-2 text-white">
            Create an Account
          </h2>

          {!isFirebaseConfigured && (
            <div className="mb-6 p-2.5 rounded bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center justify-center gap-1.5 text-center">
              <span>🟢 Local Standalone Mode Active</span>
            </div>
          )}
          
          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-200 px-4 py-2 rounded-md mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Quick 1-click guest button for immediate access */}
          <button
            type="button"
            onClick={handleGuestLogin}
            className="w-full mb-5 py-2.5 px-4 rounded-md font-medium text-sm transition-all duration-200 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-200 border border-amber-500/40 hover:border-amber-400 flex items-center justify-center gap-2 shadow-sm"
          >
            <LuZap className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Continue as Guest Architect (Instant Dev Access)</span>
          </button>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0F1521] border border-gray-700 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50"
                placeholder="John Doe"
                required
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0F1521] border border-gray-700 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50"
                placeholder="your@email.com"
                required
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0F1521] border border-gray-700 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50"
                placeholder="••••••••"
                required
              />
            </div>
            
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300 mb-1">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#0F1521] border border-gray-700 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50"
                placeholder="••••••••"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-500 hover:to-secondary-500 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {loading ? (
                <LuLoader className="animate-spin mr-2" />
              ) : 'Create Account'}
            </button>
          </form>
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#0A0F1C]/90 text-gray-400">Or continue with</span>
              </div>
            </div>
            
            <div className="mt-6">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex justify-center items-center bg-white hover:bg-gray-100 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors border border-gray-300 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <FcGoogle className="w-5 h-5 mr-2" />
                Google
              </button>
            </div>
          </div>
          
          <p className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;

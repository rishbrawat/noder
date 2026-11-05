import React, { useState, useEffect } from 'react';
import { LuKey, LuX, LuCheck, LuTrash2, LuEye, LuEyeOff, LuExternalLink, LuShieldCheck } from 'react-icons/lu';
import { toast } from 'react-hot-toast';

interface BYOKModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'noder_byok_gemini_key';

export const BYOKModal: React.FC<BYOKModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem(STORAGE_KEY) || '';
      setApiKey(stored);
      setHasExistingKey(Boolean(stored));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      localStorage.removeItem(STORAGE_KEY);
      setHasExistingKey(false);
      toast.success('BYOK Key removed. Reverted to server shared pool.');
    } else {
      localStorage.setItem(STORAGE_KEY, trimmed);
      setHasExistingKey(true);
      toast.success('Personal Gemini API Key activated!');
    }
    onClose();
  };

  const handleRemove = () => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey('');
    setHasExistingKey(false);
    toast('BYOK Key removed. Reverted to shared pool.', { icon: 'ℹ️' });
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-noder-dark border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-gold-500/10 text-gold-500 border border-gold-500/30">
              <LuKey className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Gemini API Key (BYOK)</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Bring Your Own Key for zero rate limits</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <LuX className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-zinc-600 dark:text-zinc-300">
            <div className="flex items-center space-x-1.5 font-medium text-zinc-800 dark:text-zinc-200">
              <LuShieldCheck className="w-3.5 h-3.5 text-green-500" />
              <span>Private Client-Side Storage</span>
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              Your key is saved only in your browser&apos;s local storage and sent directly via secure request header. It completely isolates your session from shared free-tier rate limits.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
              Personal Google Gemini API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 pr-10 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono placeholder:text-zinc-400 focus:outline-none focus:border-gold-500 dark:focus:border-gold-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                {showKey ? <LuEyeOff size={14} /> : <LuEye size={14} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1 text-gold-600 dark:text-gold-400 hover:underline"
            >
              <span>Get a free Gemini API key</span>
              <LuExternalLink size={11} />
            </a>
            {hasExistingKey && (
              <span className="flex items-center space-x-1 text-green-600 dark:text-green-400 font-medium">
                <LuCheck size={12} />
                <span>Active</span>
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
          {hasExistingKey ? (
            <button
              onClick={handleRemove}
              className="flex items-center space-x-1 text-xs text-red-500 hover:text-red-600 px-2.5 py-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <LuTrash2 size={13} />
              <span>Clear Key</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded text-xs font-semibold bg-gold-500 hover:bg-gold-400 text-black shadow-sm transition-colors"
            >
              Save Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BYOKModal;


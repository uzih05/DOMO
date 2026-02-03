'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { MatchBoard } from '@/src/views/match';
import type { User } from '@/src/models/types';

interface MatchScreenProps {
  user: User | null;
  onBack: () => void;
}

export const MatchScreen: React.FC<MatchScreenProps> = ({ user, onBack }) => {
  return (
    <div className="h-screen w-full bg-[var(--bg-primary)] overflow-hidden flex flex-col">
      {/* Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="liquid-bg-blob w-96 h-96 rounded-full bg-blue-500/20 -top-48 -left-48" />
        <div className="liquid-bg-blob w-80 h-80 rounded-full bg-purple-500/15 top-1/3 -right-40 animation-delay-2000" />
        <div className="liquid-bg-blob w-72 h-72 rounded-full bg-cyan-500/10 bottom-20 left-1/4 animation-delay-4000" />
      </div>

      {/* Top Bar */}
      <div className="relative z-10 glass-panel px-6 py-3 border-b border-[var(--glass-border)] flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-secondary)]">Domo</span>
          <span className="text-[var(--text-tertiary)]">/</span>
          <span className="text-sm font-medium text-[var(--text-primary)]">Match</span>
        </div>
        {user && (
          <div className="ml-auto flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-sm font-medium text-[var(--accent)]">
              {user.name?.charAt(0) || 'U'}
            </div>
            <span className="text-sm text-[var(--text-secondary)]">{user.name}</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 overflow-hidden">
        <MatchBoard currentUser={user} />
      </div>
    </div>
  );
};

export default MatchScreen;

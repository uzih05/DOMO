'use client';

import React from 'react';
import { Rocket, Trophy, BookOpen, Users } from 'lucide-react';
import type { RecruitmentCategory } from '@/src/models/types';
import { CATEGORY_LABELS } from '@/src/models/types';

interface CategoryFilterProps {
  selectedCategory: RecruitmentCategory | null;
  onSelectCategory: (category: RecruitmentCategory | null) => void;
}

const CATEGORY_ICONS: Record<RecruitmentCategory, React.ReactNode> = {
  side_project: <Rocket className="w-4 h-4" />,
  hackathon: <Trophy className="w-4 h-4" />,
  study: <BookOpen className="w-4 h-4" />,
  mentoring: <Users className="w-4 h-4" />,
};

const CATEGORIES: RecruitmentCategory[] = ['side_project', 'hackathon', 'study', 'mentoring'];

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelectCategory(null)}
        className={`
          px-4 py-2 rounded-lg text-sm font-medium
          transition-all duration-200 ease-out
          border
          ${!selectedCategory
            ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-lg shadow-[var(--accent-glow)]'
            : 'glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]/50'
          }
        `}
      >
        전체
      </button>
      {CATEGORIES.map((category) => {
        const isSelected = selectedCategory === category;

        return (
          <button
            key={category}
            onClick={() => onSelectCategory(category)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium
              transition-all duration-200 ease-out
              flex items-center gap-1.5
              border
              ${isSelected
                ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-lg shadow-[var(--accent-glow)]'
                : 'glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]/50'
              }
            `}
          >
            {CATEGORY_ICONS[category]}
            {CATEGORY_LABELS[category]}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryFilter;

'use client';

import React from 'react';
import { MapPin } from 'lucide-react';
import type { JeonbukRegion } from '@/src/models/types';
import { REGION_LABELS } from '@/src/models/types';

interface RegionFilterProps {
  selectedRegion: JeonbukRegion;
  onSelectRegion: (region: JeonbukRegion) => void;
}

const REGIONS: JeonbukRegion[] = [
  'all', 'jeonju', 'iksan', 'gunsan', 'wanju', 'jeongeup', 'namwon', 'gimje', 'online'
];

export const RegionFilter: React.FC<RegionFilterProps> = ({
  selectedRegion,
  onSelectRegion,
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {REGIONS.map((region) => {
        const isSelected = selectedRegion === region;
        const isOnline = region === 'online';

        return (
          <button
            key={region}
            onClick={() => onSelectRegion(region)}
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
            {isOnline ? (
              <span className="w-2 h-2 rounded-full bg-green-400" />
            ) : (
              <MapPin className="w-3.5 h-3.5" />
            )}
            {REGION_LABELS[region]}
          </button>
        );
      })}
    </div>
  );
};

export default RegionFilter;

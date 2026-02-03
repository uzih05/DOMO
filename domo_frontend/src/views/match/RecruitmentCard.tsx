'use client';

import React from 'react';
import { MapPin, Calendar, Users, Eye, Clock } from 'lucide-react';
import type { Recruitment } from '@/src/models/types';
import {
  REGION_LABELS,
  CATEGORY_LABELS,
  STATUS_LABELS,
  POSITION_LABELS,
} from '@/src/models/types';

interface RecruitmentCardProps {
  recruitment: Recruitment;
  onClick: () => void;
}

export const RecruitmentCard: React.FC<RecruitmentCardProps> = ({
  recruitment,
  onClick,
}) => {
  const {
    title,
    description,
    category,
    region,
    status,
    tech_stacks,
    position_slots,
    deadline,
    view_count,
    user_name,
    created_at,
  } = recruitment;

  const totalSlots = position_slots.reduce((sum, slot) => sum + slot.total, 0);
  const filledSlots = position_slots.reduce((sum, slot) => sum + slot.filled, 0);
  const remainingSlots = totalSlots - filledSlots;

  const statusColors = {
    recruiting: 'bg-green-500/20 text-green-400 border-green-500/30',
    closing_soon: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    closed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  const categoryColors = {
    side_project: 'bg-blue-500/20 text-blue-400',
    hackathon: 'bg-purple-500/20 text-purple-400',
    study: 'bg-emerald-500/20 text-emerald-400',
    mentoring: 'bg-orange-500/20 text-orange-400',
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div
      onClick={onClick}
      className="
        glass-card rounded-xl p-5 cursor-pointer
        hover:scale-[1.02] hover:shadow-xl
        transition-all duration-300 ease-out
        group
      "
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${categoryColors[category]}`}>
            {CATEGORY_LABELS[category]}
          </span>
          <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${statusColors[status]}`}>
            {STATUS_LABELS[status]}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[var(--text-tertiary)] text-xs">
          <Eye className="w-3.5 h-3.5" />
          {view_count}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2 line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2">
        {description}
      </p>

      {/* Tech Stacks */}
      {tech_stacks.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {tech_stacks.slice(0, 5).map((stack, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded text-xs bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--glass-border)]"
            >
              {stack.name}
            </span>
          ))}
          {tech_stacks.length > 5 && (
            <span className="px-2 py-0.5 rounded text-xs text-[var(--text-tertiary)]">
              +{tech_stacks.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Positions */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {position_slots.map((slot, idx) => (
          <span
            key={idx}
            className={`
              px-2 py-0.5 rounded text-xs border
              ${slot.filled < slot.total
                ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30'
                : 'bg-gray-500/10 text-gray-400 border-gray-500/30 line-through'
              }
            `}
          >
            {POSITION_LABELS[slot.position]} {slot.filled}/{slot.total}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--glass-border)]">
        <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {REGION_LABELS[region]}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {remainingSlots}명 모집 중
          </span>
        </div>
        {deadline && (
          <div className="flex items-center gap-1 text-xs">
            {getDaysUntilDeadline(deadline) <= 3 ? (
              <span className="text-[var(--error)] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                D-{getDaysUntilDeadline(deadline)}
              </span>
            ) : (
              <span className="text-[var(--text-tertiary)] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                ~{formatDate(deadline)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Author & Date */}
      <div className="flex items-center justify-between mt-3 text-xs text-[var(--text-tertiary)]">
        <span>{user_name || '익명'}</span>
        <span>{formatDate(created_at)}</span>
      </div>
    </div>
  );
};

export default RecruitmentCard;

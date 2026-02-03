'use client';

import React, { useState } from 'react';
import { X, Plus, Minus, Loader2 } from 'lucide-react';
import type {
  RecruitmentCreateRequest,
  RecruitmentCategory,
  JeonbukRegion,
  RecruitmentPosition,
  PositionSlot,
} from '@/src/models/types';
import {
  REGION_LABELS,
  CATEGORY_LABELS,
  POSITION_LABELS,
} from '@/src/models/types';
import { createRecruitment } from '@/src/models/api';

interface CreateRecruitmentModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const REGIONS: JeonbukRegion[] = [
  'jeonju', 'iksan', 'gunsan', 'wanju', 'jeongeup', 'namwon', 'gimje', 'online'
];

const CATEGORIES: RecruitmentCategory[] = ['side_project', 'hackathon', 'study', 'mentoring'];

const POSITIONS: RecruitmentPosition[] = [
  'frontend', 'backend', 'fullstack', 'designer', 'planner', 'pm', 'mobile', 'devops', 'ai_ml', 'other'
];

const SUGGESTED_STACKS = [
  'React', 'Next.js', 'Vue', 'Angular', 'TypeScript', 'JavaScript',
  'Python', 'FastAPI', 'Django', 'Node.js', 'Express', 'NestJS',
  'Java', 'Spring', 'Kotlin', 'Go', 'Rust', 'C++',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Kafka',
  'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure',
  'Figma', 'Adobe XD', 'Sketch',
  'TensorFlow', 'PyTorch', 'OpenAI',
];

export const CreateRecruitmentModal: React.FC<CreateRecruitmentModalProps> = ({
  onClose,
  onCreated,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<RecruitmentCategory>('side_project');
  const [region, setRegion] = useState<JeonbukRegion>('jeonju');
  const [techStacks, setTechStacks] = useState<string[]>([]);
  const [customStack, setCustomStack] = useState('');
  const [positionSlots, setPositionSlots] = useState<Omit<PositionSlot, 'filled'>[]>([
    { position: 'frontend', total: 1 },
  ]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deadline, setDeadline] = useState(() => {
    // 오늘 날짜를 기본값으로 설정
    return new Date().toISOString().split('T')[0];
  });
  const [contactInfo, setContactInfo] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');

  const handleAddStack = (stack: string) => {
    if (stack && !techStacks.includes(stack)) {
      setTechStacks([...techStacks, stack]);
    }
    setCustomStack('');
  };

  const handleRemoveStack = (stack: string) => {
    setTechStacks(techStacks.filter(s => s !== stack));
  };

  const handleAddPosition = () => {
    const availablePositions = POSITIONS.filter(
      pos => !positionSlots.some(slot => slot.position === pos)
    );
    if (availablePositions.length > 0) {
      setPositionSlots([...positionSlots, { position: availablePositions[0], total: 1 }]);
    }
  };

  const handleRemovePosition = (index: number) => {
    if (positionSlots.length > 1) {
      setPositionSlots(positionSlots.filter((_, i) => i !== index));
    }
  };

  const handleUpdatePosition = (index: number, updates: Partial<Omit<PositionSlot, 'filled'>>) => {
    setPositionSlots(positionSlots.map((slot, i) =>
      i === index ? { ...slot, ...updates } : slot
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('제목과 설명을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data: RecruitmentCreateRequest = {
        title: title.trim(),
        description: description.trim(),
        category,
        region,
        tech_stacks: techStacks,
        position_slots: positionSlots,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        deadline: deadline || undefined,
        contact_info: contactInfo.trim() || undefined,
        reference_url: referenceUrl.trim() || undefined,
      };

      await createRecruitment(data);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : '모집글 작성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass-panel rounded-2xl w-full max-w-2xl max-h-[90vh] mx-4 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--glass-border)]">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">새 모집글 작성</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar">
          <div className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                제목 *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="프로젝트/스터디 제목을 입력하세요"
                className="w-full px-4 py-3 rounded-xl"
                required
              />
            </div>

            {/* Category & Region */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  카테고리 *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as RecruitmentCategory)}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--glass-border)] text-[var(--text-primary)]"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  지역 *
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value as JeonbukRegion)}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--glass-border)] text-[var(--text-primary)]"
                >
                  {REGIONS.map((reg) => (
                    <option key={reg} value={reg}>{REGION_LABELS[reg]}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                프로젝트 설명 *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="프로젝트/스터디에 대해 자세히 설명해주세요.&#10;&#10;- 목표 및 주제&#10;- 진행 방식&#10;- 예상 기간&#10;- 원하는 팀원상"
                rows={6}
                className="w-full px-4 py-3 rounded-xl resize-none"
                required
              />
            </div>

            {/* Tech Stacks */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                기술 스택
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {techStacks.map((stack) => (
                  <span
                    key={stack}
                    className="px-3 py-1.5 rounded-lg text-sm bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 flex items-center gap-1"
                  >
                    {stack}
                    <button
                      type="button"
                      onClick={() => handleRemoveStack(stack)}
                      className="ml-1 hover:text-[var(--error)]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={customStack}
                  onChange={(e) => setCustomStack(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddStack(customStack.trim());
                    }
                  }}
                  placeholder="기술 스택 추가"
                  className="flex-1 px-4 py-2 rounded-lg text-sm"
                />
                <button
                  type="button"
                  onClick={() => handleAddStack(customStack.trim())}
                  className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm"
                >
                  추가
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_STACKS.filter(s => !techStacks.includes(s)).slice(0, 12).map((stack) => (
                  <button
                    key={stack}
                    type="button"
                    onClick={() => handleAddStack(stack)}
                    className="px-2.5 py-1 rounded-lg text-xs bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--accent)]/20 hover:text-[var(--accent)] transition-colors"
                  >
                    + {stack}
                  </button>
                ))}
              </div>
            </div>

            {/* Position Slots */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                모집 포지션
              </label>
              <div className="space-y-2">
                {positionSlots.map((slot, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <select
                      value={slot.position}
                      onChange={(e) => handleUpdatePosition(index, { position: e.target.value as RecruitmentPosition })}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--glass-border)] text-[var(--text-primary)] text-sm"
                    >
                      {POSITIONS.map((pos) => (
                        <option
                          key={pos}
                          value={pos}
                          disabled={positionSlots.some((s, i) => i !== index && s.position === pos)}
                        >
                          {POSITION_LABELS[pos]}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdatePosition(index, { total: Math.max(1, slot.total - 1) })}
                        className="p-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--error)]/20 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center text-[var(--text-primary)]">{slot.total}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdatePosition(index, { total: slot.total + 1 })}
                        className="p-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--accent)]/20 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {positionSlots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePosition(index)}
                        className="p-1.5 rounded-lg hover:bg-[var(--error)]/20 text-[var(--text-tertiary)] hover:text-[var(--error)] transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {positionSlots.length < POSITIONS.length && (
                <button
                  type="button"
                  onClick={handleAddPosition}
                  className="mt-2 px-4 py-2 rounded-lg border border-dashed border-[var(--glass-border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors text-sm flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  포지션 추가
                </button>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  시작 예정일
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  종료 예정일
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  모집 마감일
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg text-sm"
                />
              </div>
            </div>

            {/* Contact & Reference */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  연락처 (선택)
                </label>
                <input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="이메일 또는 오픈채팅 링크"
                  className="w-full px-4 py-2.5 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  참고 링크 (선택)
                </label>
                <input
                  type="url"
                  value={referenceUrl}
                  onChange={(e) => setReferenceUrl(e.target.value)}
                  placeholder="노션, GitHub 등"
                  className="w-full px-4 py-2.5 rounded-lg text-sm"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-[var(--error)] bg-[var(--error)]/10 px-4 py-2 rounded-lg">
                {error}
              </p>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-[var(--glass-border)]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !title.trim() || !description.trim()}
            className="flex-1 btn-primary px-4 py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              '모집글 작성'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateRecruitmentModal;

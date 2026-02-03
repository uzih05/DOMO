'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  Eye,
  Clock,
  Link as LinkIcon,
  Mail,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
  Rocket,
  Edit3,
  Lock,
} from 'lucide-react';
import { EditRecruitmentModal } from './EditRecruitmentModal';
import type {
  Recruitment,
  Application,
  ApplicationCreateRequest,
  RecruitmentPosition,
  User,
} from '@/src/models/types';
import {
  REGION_LABELS,
  CATEGORY_LABELS,
  STATUS_LABELS,
  POSITION_LABELS,
  APPLICATION_STATUS_LABELS,
} from '@/src/models/types';
import {
  getApplications,
  createApplication,
  updateApplicationStatus,
  updateRecruitmentStatus,
  createWorkspaceFromRecruitment,
} from '@/src/models/api';

interface RecruitmentDetailProps {
  recruitment: Recruitment;
  currentUser: User | null;
  onBack: () => void;
  onRefresh: () => void;
}

export const RecruitmentDetail: React.FC<RecruitmentDetailProps> = ({
  recruitment,
  currentUser,
  onBack,
  onRefresh,
}) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [closingRecruitment, setClosingRecruitment] = useState(false);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);

  // Apply form state
  const [selectedPosition, setSelectedPosition] = useState<RecruitmentPosition | ''>('');
  const [introduction, setIntroduction] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');

  const isOwner = currentUser?.id === recruitment.user_id;
  const hasApplied = applications.some(app => app.user_id === currentUser?.id);
  const allSlotsFilled = recruitment.position_slots.every(slot => slot.filled >= slot.total);

  const availablePositions = recruitment.position_slots.filter(
    slot => slot.filled < slot.total
  );

  // Load applications if owner
  useEffect(() => {
    if (isOwner) {
      loadApplications();
    }
  }, [isOwner, recruitment.id]);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getApplications(recruitment.id);
      setApplications(data);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setLoading(false);
    }
  }, [recruitment.id]);

  const handleApply = async () => {
    if (!selectedPosition || !introduction.trim()) return;

    setApplying(true);
    try {
      const data: ApplicationCreateRequest = {
        position: selectedPosition as RecruitmentPosition,
        introduction: introduction.trim(),
        portfolio_url: portfolioUrl.trim() || undefined,
      };
      await createApplication(recruitment.id, data);
      setShowApplyForm(false);
      setSelectedPosition('');
      setIntroduction('');
      setPortfolioUrl('');
      onRefresh();
    } catch (error) {
      console.error('Failed to apply:', error);
      alert('지원에 실패했습니다.');
    } finally {
      setApplying(false);
    }
  };

  const handleUpdateStatus = async (applicationId: number, status: 'accepted' | 'rejected') => {
    try {
      await updateApplicationStatus(applicationId, { status });
      await loadApplications();
      onRefresh();
    } catch (error) {
      console.error('Failed to update application status:', error);
    }
  };

  const handleCreateWorkspace = async () => {
    setCreatingWorkspace(true);
    try {
      const result = await createWorkspaceFromRecruitment(recruitment.id);
      alert(`워크스페이스가 생성되었습니다!\n초대 링크: ${result.invite_link}`);
      onRefresh();
    } catch (error) {
      console.error('Failed to create workspace:', error);
      alert('워크스페이스 생성에 실패했습니다.');
    } finally {
      setCreatingWorkspace(false);
    }
  };

  // 모집 마감 + 자동 워크스페이스 생성
  const handleCloseRecruitment = async () => {
    if (!confirm('모집을 마감하시겠습니까?\n마감 후 수락된 지원자들과 함께 워크스페이스가 자동 생성됩니다.')) {
      return;
    }

    setClosingRecruitment(true);
    try {
      // 1. 모집 상태를 closed로 변경
      await updateRecruitmentStatus(recruitment.id, 'closed');

      // 2. 자동으로 워크스페이스 생성
      const result = await createWorkspaceFromRecruitment(recruitment.id);
      alert(`모집이 마감되었습니다!\n워크스페이스가 생성되었습니다.\n초대 링크: ${result.invite_link}`);
      onRefresh();
    } catch (error) {
      console.error('Failed to close recruitment:', error);
      alert('모집 마감에 실패했습니다.');
    } finally {
      setClosingRecruitment(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

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

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="sticky top-0 z-10 glass-panel px-6 py-4 border-b border-[var(--glass-border)]">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          목록으로
        </button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${categoryColors[recruitment.category]}`}>
                {CATEGORY_LABELS[recruitment.category]}
              </span>
              <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${statusColors[recruitment.status]}`}>
                {STATUS_LABELS[recruitment.status]}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{recruitment.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-[var(--text-secondary)]">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {REGION_LABELS[recruitment.region]}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                조회 {recruitment.view_count}
              </span>
              <span>{recruitment.user_name || '익명'}</span>
              <span>{formatDate(recruitment.created_at)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {/* 작성자: 수정 버튼 (모집 중일 때만) */}
            {isOwner && recruitment.status !== 'closed' && (
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 rounded-xl border border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2 text-sm"
              >
                <Edit3 className="w-4 h-4" />
                수정
              </button>
            )}

            {/* 작성자: 모집 마감 버튼 (모집 중일 때만) */}
            {isOwner && recruitment.status !== 'closed' && (
              <button
                onClick={handleCloseRecruitment}
                disabled={closingRecruitment}
                className="px-4 py-2 rounded-xl bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
              >
                {closingRecruitment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                모집 마감
              </button>
            )}

            {/* 작성자: 워크스페이스 생성 버튼 (마감 후 워크스페이스 없을 때) */}
            {isOwner && recruitment.status === 'closed' && !recruitment.workspace_id && (
              <button
                onClick={handleCreateWorkspace}
                disabled={creatingWorkspace}
                className="btn-primary px-4 py-2 rounded-xl flex items-center gap-2 text-sm disabled:opacity-50"
              >
                {creatingWorkspace ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Rocket className="w-4 h-4" />
                )}
                워크스페이스 생성
              </button>
            )}

            {/* 지원자: 지원하기 버튼 */}
            {!isOwner && !hasApplied && recruitment.status !== 'closed' && !allSlotsFilled && (
              <button
                onClick={() => setShowApplyForm(true)}
                className="btn-primary px-6 py-2 rounded-xl flex items-center gap-2 text-sm"
              >
                <Send className="w-4 h-4" />
                지원하기
              </button>
            )}

            {/* 지원자: 지원 완료 표시 */}
            {hasApplied && (
              <span className="px-4 py-2 rounded-xl bg-[var(--accent)]/20 text-[var(--accent)] text-sm">
                지원 완료
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Description */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">프로젝트 소개</h2>
          <p className="text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
            {recruitment.description}
          </p>
        </div>

        {/* Schedule & Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(recruitment.start_date || recruitment.end_date) && (
            <div className="glass-card rounded-xl p-5">
              <h3 className="text-sm font-medium text-[var(--text-tertiary)] mb-2">프로젝트 기간</h3>
              <div className="flex items-center gap-2 text-[var(--text-primary)]">
                <Calendar className="w-5 h-5 text-[var(--accent)]" />
                {recruitment.start_date && formatDate(recruitment.start_date)}
                {recruitment.start_date && recruitment.end_date && ' ~ '}
                {recruitment.end_date && formatDate(recruitment.end_date)}
              </div>
            </div>
          )}

          {recruitment.deadline && (
            <div className="glass-card rounded-xl p-5">
              <h3 className="text-sm font-medium text-[var(--text-tertiary)] mb-2">모집 마감일</h3>
              <div className="flex items-center gap-2 text-[var(--error)]">
                <Clock className="w-5 h-5" />
                {formatDate(recruitment.deadline)}
              </div>
            </div>
          )}

          {recruitment.contact_info && (
            <div className="glass-card rounded-xl p-5">
              <h3 className="text-sm font-medium text-[var(--text-tertiary)] mb-2">연락처</h3>
              <div className="flex items-center gap-2 text-[var(--text-primary)]">
                <Mail className="w-5 h-5 text-[var(--accent)]" />
                {recruitment.contact_info}
              </div>
            </div>
          )}

          {recruitment.reference_url && (
            <div className="glass-card rounded-xl p-5">
              <h3 className="text-sm font-medium text-[var(--text-tertiary)] mb-2">참고 링크</h3>
              <a
                href={recruitment.reference_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[var(--accent)] hover:underline"
              >
                <LinkIcon className="w-5 h-5" />
                {recruitment.reference_url}
              </a>
            </div>
          )}
        </div>

        {/* Tech Stacks */}
        {recruitment.tech_stacks.length > 0 && (
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">기술 스택</h2>
            <div className="flex flex-wrap gap-2">
              {recruitment.tech_stacks.map((stack, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-lg text-sm bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30"
                >
                  {stack.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Position Slots */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">모집 포지션</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {recruitment.position_slots.map((slot, idx) => {
              const isFull = slot.filled >= slot.total;
              return (
                <div
                  key={idx}
                  className={`
                    p-4 rounded-xl border text-center transition-all
                    ${isFull
                      ? 'bg-gray-500/10 border-gray-500/30 opacity-60'
                      : 'bg-[var(--accent)]/10 border-[var(--accent)]/30'
                    }
                  `}
                >
                  <div className={`text-lg font-bold ${isFull ? 'text-gray-400' : 'text-[var(--accent)]'}`}>
                    {slot.filled}/{slot.total}
                  </div>
                  <div className={`text-sm mt-1 ${isFull ? 'text-gray-500 line-through' : 'text-[var(--text-secondary)]'}`}>
                    {POSITION_LABELS[slot.position]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Applications (Owner Only) */}
        {isOwner && (
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              지원자 관리 ({applications.length}명)
            </h2>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
              </div>
            ) : applications.length === 0 ? (
              <p className="text-center py-8 text-[var(--text-tertiary)]">아직 지원자가 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--glass-border)]"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-[var(--text-primary)]">
                            {app.user_name || app.user?.name || '익명'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs bg-[var(--accent)]/20 text-[var(--accent)]">
                            {POSITION_LABELS[app.position]}
                          </span>
                          <span className={`
                            px-2 py-0.5 rounded text-xs
                            ${app.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : ''}
                            ${app.status === 'accepted' ? 'bg-green-500/20 text-green-400' : ''}
                            ${app.status === 'rejected' ? 'bg-red-500/20 text-red-400' : ''}
                          `}>
                            {APPLICATION_STATUS_LABELS[app.status]}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] mt-2">{app.introduction}</p>
                        {app.portfolio_url && (
                          <a
                            href={app.portfolio_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[var(--accent)] hover:underline mt-1 block"
                          >
                            {app.portfolio_url}
                          </a>
                        )}
                      </div>
                      {app.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateStatus(app.id, 'accepted')}
                            className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(app.id, 'rejected')}
                            className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Apply Modal */}
      {showApplyForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="glass-panel rounded-2xl p-6 w-full max-w-lg mx-4 animate-fade-in">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">지원하기</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  지원 포지션
                </label>
                <select
                  value={selectedPosition}
                  onChange={(e) => setSelectedPosition(e.target.value as RecruitmentPosition)}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--glass-border)] text-[var(--text-primary)]"
                >
                  <option value="">포지션 선택</option>
                  {availablePositions.map((slot) => (
                    <option key={slot.position} value={slot.position}>
                      {POSITION_LABELS[slot.position]} ({slot.total - slot.filled}명 모집 중)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  자기소개
                </label>
                <textarea
                  value={introduction}
                  onChange={(e) => setIntroduction(e.target.value)}
                  placeholder="간단한 자기소개와 지원 동기를 작성해주세요."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  포트폴리오 링크 (선택)
                </label>
                <input
                  type="url"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="GitHub, 포트폴리오 URL"
                  className="w-full px-4 py-3 rounded-xl"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowApplyForm(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleApply}
                disabled={!selectedPosition || !introduction.trim() || applying}
                className="flex-1 btn-primary px-4 py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {applying ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    지원하기
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <EditRecruitmentModal
          recruitment={recruitment}
          onClose={() => setShowEditModal(false)}
          onUpdated={() => {
            setShowEditModal(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};

export default RecruitmentDetail;

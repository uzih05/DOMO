'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Send,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Users,
  Eye,
  Calendar,
} from 'lucide-react';
import type {
  Recruitment,
  Application,
  User,
} from '@/src/models/types';
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  POSITION_LABELS,
  APPLICATION_STATUS_LABELS,
} from '@/src/models/types';
import { getMyRecruitments, getMyApplications, getApplications } from '@/src/models/api';

interface MyActivityViewProps {
  currentUser: User | null;
  onSelectRecruitment: (recruitment: Recruitment) => void;
}

type ActivityTab = 'my_posts' | 'my_applications';

export const MyActivityView: React.FC<MyActivityViewProps> = ({
  currentUser,
  onSelectRecruitment,
}) => {
  const [activeTab, setActiveTab] = useState<ActivityTab>('my_posts');
  const [myRecruitments, setMyRecruitments] = useState<Recruitment[]>([]);
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [recruitmentApplications, setRecruitmentApplications] = useState<Record<number, Application[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedRecruitment, setExpandedRecruitment] = useState<number | null>(null);

  const loadMyRecruitments = useCallback(async () => {
    try {
      const data = await getMyRecruitments();
      setMyRecruitments(data);

      const applicationsMap: Record<number, Application[]> = {};
      for (const recruitment of data) {
        try {
          const apps = await getApplications(recruitment.id);
          applicationsMap[recruitment.id] = apps;
        } catch {
          applicationsMap[recruitment.id] = [];
        }
      }
      setRecruitmentApplications(applicationsMap);
    } catch (error) {
      console.error('Failed to load my recruitments:', error);
    }
  }, []);

  const loadMyApplications = useCallback(async () => {
    try {
      const data = await getMyApplications();
      setMyApplications(data);
    } catch (error) {
      console.error('Failed to load my applications:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadMyRecruitments(), loadMyApplications()]);
      setLoading(false);
    };
    loadData();
  }, [loadMyRecruitments, loadMyApplications]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'accepted':
        return 'bg-green-500/20 text-green-400';
      case 'rejected':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getApplicationStats = (recruitmentId: number) => {
    const apps = recruitmentApplications[recruitmentId] || [];
    return {
      total: apps.length,
      pending: apps.filter(a => a.status === 'pending').length,
      accepted: apps.filter(a => a.status === 'accepted').length,
      rejected: apps.filter(a => a.status === 'rejected').length,
    };
  };

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-[var(--text-secondary)]">로그인이 필요합니다.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--accent)] mb-4" />
        <p className="text-[var(--text-secondary)]">내 활동을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('my_posts')}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
            ${activeTab === 'my_posts'
              ? 'bg-[var(--accent)] text-white'
              : 'glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }
          `}
        >
          <FileText className="w-4 h-4" />
          내가 작성한 글
          {myRecruitments.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'my_posts' ? 'bg-white/20' : 'bg-[var(--accent)]/20 text-[var(--accent)]'
            }`}>
              {myRecruitments.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('my_applications')}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
            ${activeTab === 'my_applications'
              ? 'bg-[var(--accent)] text-white'
              : 'glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }
          `}
        >
          <Send className="w-4 h-4" />
          내가 지원한 글
          {myApplications.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'my_applications' ? 'bg-white/20' : 'bg-[var(--accent)]/20 text-[var(--accent)]'
            }`}>
              {myApplications.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'my_posts' ? (
        <div className="space-y-3">
          {myRecruitments.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-tertiary)]">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>작성한 모집글이 없습니다.</p>
            </div>
          ) : (
            myRecruitments.map((recruitment) => {
              const stats = getApplicationStats(recruitment.id);
              const isExpanded = expandedRecruitment === recruitment.id;
              const apps = recruitmentApplications[recruitment.id] || [];

              return (
                <div key={recruitment.id} className="glass-card rounded-xl overflow-hidden">
                  <div
                    className="p-4 cursor-pointer hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                    onClick={() => setExpandedRecruitment(isExpanded ? null : recruitment.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`
                            px-2 py-0.5 rounded text-xs font-medium
                            ${recruitment.status === 'recruiting' ? 'bg-green-500/20 text-green-400' : ''}
                            ${recruitment.status === 'closing_soon' ? 'bg-yellow-500/20 text-yellow-400' : ''}
                            ${recruitment.status === 'closed' ? 'bg-gray-500/20 text-gray-400' : ''}
                          `}>
                            {STATUS_LABELS[recruitment.status]}
                          </span>
                          <span className="text-xs text-[var(--text-tertiary)]">
                            {CATEGORY_LABELS[recruitment.category]}
                          </span>
                        </div>
                        <h3 className="font-medium text-[var(--text-primary)] mb-2">
                          {recruitment.title}
                        </h3>
                        <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            {recruitment.view_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(recruitment.created_at)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="w-4 h-4 text-[var(--text-tertiary)]" />
                            <span className="text-[var(--text-primary)] font-medium">{stats.total}명</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-xs">
                            <span className="text-yellow-400">{stats.pending} 대기</span>
                            <span className="text-[var(--text-tertiary)]">·</span>
                            <span className="text-green-400">{stats.accepted} 수락</span>
                            <span className="text-[var(--text-tertiary)]">·</span>
                            <span className="text-red-400">{stats.rejected} 거절</span>
                          </div>
                        </div>
                        <ChevronRight className={`w-5 h-5 text-[var(--text-tertiary)] transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-[var(--glass-border)]">
                      {apps.length === 0 ? (
                        <p className="p-4 text-sm text-[var(--text-tertiary)] text-center">
                          아직 지원자가 없습니다.
                        </p>
                      ) : (
                        <div className="divide-y divide-[var(--glass-border)]">
                          {apps.map((app) => (
                            <div key={app.id} className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${getStatusStyle(app.status)}`}>
                                  {getStatusIcon(app.status)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-[var(--text-primary)]">
                                      {app.user_name || app.user?.name || '익명'}
                                    </span>
                                    <span className="px-2 py-0.5 rounded text-xs bg-[var(--accent)]/20 text-[var(--accent)]">
                                      {POSITION_LABELS[app.position]}
                                    </span>
                                  </div>
                                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                                    {formatDate(app.created_at)} 지원
                                  </p>
                                </div>
                              </div>
                              <span className={`px-3 py-1 rounded-lg text-xs font-medium ${getStatusStyle(app.status)}`}>
                                {APPLICATION_STATUS_LABELS[app.status]}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="p-3 bg-[var(--bg-tertiary)]/30">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectRecruitment(recruitment);
                          }}
                          className="w-full py-2 rounded-lg text-sm text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
                        >
                          상세 보기 및 관리
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {myApplications.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-tertiary)]">
              <Send className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>지원한 모집글이 없습니다.</p>
            </div>
          ) : (
            myApplications.map((application) => (
              <div
                key={application.id}
                className="glass-card rounded-xl p-4 hover:border-[var(--accent)]/30 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl ${getStatusStyle(application.status)}`}>
                      {getStatusIcon(application.status)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-3 py-1 rounded-lg text-xs font-medium ${getStatusStyle(application.status)}`}>
                          {APPLICATION_STATUS_LABELS[application.status]}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs bg-[var(--accent)]/20 text-[var(--accent)]">
                          {POSITION_LABELS[application.position]}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] mt-2 line-clamp-2">
                        {application.introduction}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-2">
                        {formatDate(application.created_at)} 지원
                      </p>
                    </div>
                  </div>
                </div>

                {application.status === 'accepted' && (
                  <div className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-sm text-green-400">
                      지원이 수락되었습니다! 워크스페이스 초대를 확인하세요.
                    </p>
                  </div>
                )}

                {application.status === 'rejected' && (
                  <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-sm text-red-400">
                      아쉽게도 이번에는 함께하지 못하게 되었습니다.
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MyActivityView;

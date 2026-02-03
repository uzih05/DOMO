'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Loader2, RefreshCw, Users, Rocket, List, User } from 'lucide-react';
import type {
  Recruitment,
  RecruitmentFilter,
  JeonbukRegion,
  RecruitmentCategory,
  User,
} from '@/src/models/types';
import { getRecruitments } from '@/src/models/api';
import { RegionFilter } from './RegionFilter';
import { CategoryFilter } from './CategoryFilter';
import { RecruitmentCard } from './RecruitmentCard';
import { RecruitmentDetail } from './RecruitmentDetail';
import { CreateRecruitmentModal } from './CreateRecruitmentModal';
import { MyActivityView } from './MyActivityView';

type MainTab = 'all' | 'my_activity';

interface MatchBoardProps {
  currentUser: User | null;
}

export const MatchBoard: React.FC<MatchBoardProps> = ({ currentUser }) => {
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const [selectedRegion, setSelectedRegion] = useState<JeonbukRegion>('all');
  const [selectedCategory, setSelectedCategory] = useState<RecruitmentCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // View state
  const [mainTab, setMainTab] = useState<MainTab>('all');
  const [selectedRecruitment, setSelectedRecruitment] = useState<Recruitment | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadRecruitments = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);

    try {
      const filter: RecruitmentFilter = {};
      if (selectedRegion !== 'all') filter.region = selectedRegion;
      if (selectedCategory) filter.category = selectedCategory;
      if (searchQuery.trim()) filter.search = searchQuery.trim();

      const data = await getRecruitments(filter);
      setRecruitments(data);
    } catch (error) {
      console.error('Failed to load recruitments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRegion, selectedCategory, searchQuery]);

  useEffect(() => {
    loadRecruitments();
  }, [selectedRegion, selectedCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadRecruitments();
  };

  const handleRefresh = () => {
    loadRecruitments(false);
  };

  const handleCreated = () => {
    setShowCreateModal(false);
    loadRecruitments(false);
  };

  const handleSelectRecruitment = async (recruitment: Recruitment) => {
    setSelectedRecruitment(recruitment);
  };

  const handleBackToList = () => {
    setSelectedRecruitment(null);
    loadRecruitments(false);
  };

  // Detail view
  if (selectedRecruitment) {
    return (
      <RecruitmentDetail
        recruitment={selectedRecruitment}
        currentUser={currentUser}
        onBack={handleBackToList}
        onRefresh={() => loadRecruitments(false)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="glass-panel px-6 py-5 border-b border-[var(--glass-border)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--accent)]/20">
              <Users className="w-6 h-6 text-[var(--accent)]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">Domo Match</h1>
              <p className="text-sm text-[var(--text-secondary)]">전북 지역 개발자 팀 빌딩 플랫폼</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 rounded-xl glass-card hover:border-[var(--accent)]/50 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 text-[var(--text-secondary)] ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {currentUser && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                모집글 작성
              </button>
            )}
          </div>
        </div>

        {/* Main Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMainTab('all')}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
              ${mainTab === 'all'
                ? 'bg-[var(--accent)] text-white'
                : 'glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }
            `}
          >
            <List className="w-4 h-4" />
            전체 모집글
          </button>
          {currentUser && (
            <button
              onClick={() => setMainTab('my_activity')}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                ${mainTab === 'my_activity'
                  ? 'bg-[var(--accent)] text-white'
                  : 'glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }
              `}
            >
              <User className="w-4 h-4" />
              내 활동
            </button>
          )}
        </div>

        {/* Search & Filters (전체 모집글 탭에서만 표시) */}
        {mainTab === 'all' && (
          <>
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="프로젝트, 기술 스택, 키워드로 검색..."
                  className="w-full pl-12 pr-4 py-3 rounded-xl"
                />
              </div>
            </form>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-2">지역</p>
                <RegionFilter
                  selectedRegion={selectedRegion}
                  onSelectRegion={setSelectedRegion}
                />
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-2">카테고리</p>
                <CategoryFilter
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {mainTab === 'all' ? (
          // 전체 모집글 탭
          loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="w-10 h-10 animate-spin text-[var(--accent)] mb-4" />
              <p className="text-[var(--text-secondary)]">모집글을 불러오는 중...</p>
            </div>
          ) : recruitments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="p-4 rounded-full bg-[var(--bg-tertiary)] mb-4">
                <Rocket className="w-12 h-12 text-[var(--text-tertiary)]" />
              </div>
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                아직 모집글이 없습니다
              </h3>
              <p className="text-[var(--text-secondary)] mb-4">
                첫 번째 모집글을 작성해보세요!
              </p>
              {currentUser && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary px-6 py-2.5 rounded-xl flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  모집글 작성하기
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recruitments.map((recruitment) => (
                <RecruitmentCard
                  key={recruitment.id}
                  recruitment={recruitment}
                  onClick={() => handleSelectRecruitment(recruitment)}
                />
              ))}
            </div>
          )
        ) : (
          // 내 활동 탭
          <MyActivityView
            currentUser={currentUser}
            onSelectRecruitment={handleSelectRecruitment}
          />
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateRecruitmentModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
};

export default MatchBoard;

// ============================================
// Domo-Match API
// 프로젝트/스터디 모집 및 매칭 시스템
// ============================================

import { apiFetch } from './config';
import type {
  Recruitment,
  RecruitmentCreateRequest,
  RecruitmentUpdateRequest,
  RecruitmentFilter,
  Application,
  ApplicationCreateRequest,
  ApplicationUpdateRequest,
  Seminar,
} from '../types';

// ============================================
// 모집 공고 (Recruitment) API
// ============================================

/**
 * 모집 공고 목록 조회 (필터링 지원)
 */
export async function getRecruitments(filter?: RecruitmentFilter): Promise<Recruitment[]> {
  const params = new URLSearchParams();

  if (filter?.region && filter.region !== 'all') {
    params.append('region', filter.region);
  }
  if (filter?.category) {
    params.append('category', filter.category);
  }
  if (filter?.position) {
    params.append('position', filter.position);
  }
  if (filter?.status) {
    params.append('status', filter.status);
  }
  if (filter?.tech_stack) {
    params.append('tech_stack', filter.tech_stack);
  }
  if (filter?.search) {
    params.append('search', filter.search);
  }

  const queryString = params.toString();
  const endpoint = `/match/recruitments${queryString ? `?${queryString}` : ''}`;

  return apiFetch<Recruitment[]>(endpoint);
}

/**
 * 모집 공고 상세 조회
 */
export async function getRecruitment(recruitmentId: number): Promise<Recruitment> {
  return apiFetch<Recruitment>(`/match/recruitments/${recruitmentId}`);
}

/**
 * 내 모집 공고 목록 조회
 */
export async function getMyRecruitments(): Promise<Recruitment[]> {
  return apiFetch<Recruitment[]>('/match/recruitments/me');
}

/**
 * 모집 공고 생성
 */
export async function createRecruitment(data: RecruitmentCreateRequest): Promise<Recruitment> {
  return apiFetch<Recruitment>('/match/recruitments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 모집 공고 수정
 */
export async function updateRecruitment(
  recruitmentId: number,
  data: RecruitmentUpdateRequest
): Promise<Recruitment> {
  return apiFetch<Recruitment>(`/match/recruitments/${recruitmentId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * 모집 공고 삭제
 */
export async function deleteRecruitment(recruitmentId: number): Promise<void> {
  await apiFetch<void>(`/match/recruitments/${recruitmentId}`, {
    method: 'DELETE',
  });
}

/**
 * 모집 공고 상태 변경 (모집 중 -> 마감 임박 -> 모집 완료)
 */
export async function updateRecruitmentStatus(
  recruitmentId: number,
  status: 'recruiting' | 'closing_soon' | 'closed'
): Promise<Recruitment> {
  return apiFetch<Recruitment>(`/match/recruitments/${recruitmentId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

/**
 * 워크스페이스 생성 및 연동 (모집 완료 시)
 */
export async function createWorkspaceFromRecruitment(
  recruitmentId: number
): Promise<{ workspace_id: number; invite_link: string }> {
  return apiFetch<{ workspace_id: number; invite_link: string }>(
    `/match/recruitments/${recruitmentId}/create-workspace`,
    { method: 'POST' }
  );
}

// ============================================
// 지원 (Application) API
// ============================================

/**
 * 모집 공고의 지원자 목록 조회 (모집자 전용)
 */
export async function getApplications(recruitmentId: number): Promise<Application[]> {
  return apiFetch<Application[]>(`/match/recruitments/${recruitmentId}/applications`);
}

/**
 * 지원하기
 */
export async function createApplication(
  recruitmentId: number,
  data: ApplicationCreateRequest
): Promise<Application> {
  return apiFetch<Application>(`/match/recruitments/${recruitmentId}/apply`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 내 지원 목록 조회
 */
export async function getMyApplications(): Promise<Application[]> {
  return apiFetch<Application[]>('/match/applications/me');
}

/**
 * 지원 상태 변경 (수락/거절)
 */
export async function updateApplicationStatus(
  applicationId: number,
  data: ApplicationUpdateRequest
): Promise<Application> {
  return apiFetch<Application>(`/match/applications/${applicationId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * 지원 취소
 */
export async function cancelApplication(applicationId: number): Promise<void> {
  await apiFetch<void>(`/match/applications/${applicationId}`, {
    method: 'DELETE',
  });
}

// ============================================
// 세미나/원데이 클래스 API
// ============================================

/**
 * 세미나 목록 조회
 */
export async function getSeminars(region?: string): Promise<Seminar[]> {
  const endpoint = region && region !== 'all'
    ? `/match/seminars?region=${region}`
    : '/match/seminars';
  return apiFetch<Seminar[]>(endpoint);
}

/**
 * 세미나 상세 조회
 */
export async function getSeminar(seminarId: number): Promise<Seminar> {
  return apiFetch<Seminar>(`/match/seminars/${seminarId}`);
}

/**
 * 세미나 참가 신청
 */
export async function joinSeminar(seminarId: number): Promise<void> {
  await apiFetch<void>(`/match/seminars/${seminarId}/join`, {
    method: 'POST',
  });
}

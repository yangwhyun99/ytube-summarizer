---
name: knowledge-merge
description: 같은 주제의 영상 요약본들을 누적 병합하여 종합본을 만드는 로직. 섹션 매칭, 중복 제거, 보완, 신설 작업 시 참조.
---

# Knowledge Merge Skill

## 병합 아키텍처

### 핵심 원칙
- 종합본을 **섹션별로 분리 관리** (전체를 한 번에 재처리하지 않음)
- 새 요약이 들어오면 관련 섹션만 가져와서 병합
- 영상 50개 이상 누적되어도 매번 처리하는 토큰은 일정

### 병합 흐름
```
1. 새 영상 요약 생성
2. 기존 종합본의 목차(섹션 리스트)와 비교 → AI가 관련 섹션 판별
3. 해당 섹션만 가져와서 병합:
   - 중복 내용 → 삭제
   - 기존 내용 보완 → 업데이트
   - 새로운 내용 → 신규 섹션 추가
4. 변경 diff 표시 → 사용자 승인/수정
5. 종합본 업데이트 완료
```

## 섹션 매칭 프롬프트

```python
SECTION_MATCH_PROMPT = """
아래는 기존 종합본의 섹션 목차와, 새로 추가된 영상 요약입니다.

## 기존 종합본 섹션 목차
{section_list}

## 새 영상 요약
{new_summary}

## 지시사항
1. 새 요약의 각 내용이 기존 어느 섹션에 해당하는지 판별하세요.
2. 기존 섹션에 해당하지 않는 새로운 내용이 있으면 "NEW_SECTION"으로 표시하세요.

JSON 형식으로만 응답:
{{"matches": [
  {{"content": "새 요약의 내용 요약", "target_section": "기존 섹션명 또는 NEW_SECTION", "action": "update|add"}},
  ...
]}}
"""
```

## 섹션 병합 프롬프트

```python
MERGE_PROMPT = """
아래는 기존 섹션 내용과, 새로 추가할 내용입니다.
두 내용을 병합하여 하나의 완성된 섹션으로 만들어주세요.

## 규칙
- 중복되는 내용은 하나만 남기세요
- 기존 내용이 부족했던 부분은 새 내용으로 보완하세요
- 상충하는 정보가 있으면 최신 정보를 우선하세요
- 원래 섹션의 구조와 톤을 유지하세요

## 기존 섹션: {section_name}
{existing_content}

## 새로 추가할 내용
{new_content}

## 출처
새 내용의 출처 영상: {video_title} ({video_url})
"""
```

## DB 구조 (참고용)

```
knowledge_bases (종합본)
  ├── id
  ├── user_id
  ├── title (예: "Claude Code 종합 가이드")
  ├── created_at
  └── updated_at

knowledge_sections (섹션별 분리)
  ├── id
  ├── knowledge_base_id
  ├── section_title
  ├── section_order
  ├── content (마크다운)
  ├── source_video_ids (어떤 영상들에서 왔는지)
  └── updated_at

merge_history (병합 이력)
  ├── id
  ├── knowledge_base_id
  ├── video_summary_id
  ├── changes_diff (변경 내용)
  ├── status (pending/approved/rejected)
  └── created_at
```

## 비용
- 섹션 매칭: ~500 토큰 (매우 가벼움)
- 섹션 병합: 섹션당 ~2,000~5,000 토큰
- 영상 1개 추가 시 총 추가 비용: $0.02~0.05 (30~70원)

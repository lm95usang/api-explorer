# EBP V2 - API Explorer

EBP V2 API 테스트를 위한 웹 기반 API Explorer입니다.

## 사용 라이브러리

- **Bootstrap 5.3.2** - UI 프레임워크 (CDN)
- **Bootstrap Icons 1.11.1** - 아이콘 (CDN)
- **jQuery 3.7.1** - DOM 조작 및 AJAX (CDN)

## 구동 방법

### 1. 정적 웹서버 사용

```bash
# Python 3
python -m http.server 8000

# Node.js (http-server)
npx http-server -p 8000

# PHP
php -S localhost:8000
```

브라우저에서 `http://localhost:8000` 접속

### 2. VS Code Live Server

1. VS Code에서 Live Server 확장 설치
2. `index.html` 우클릭 → "Open with Live Server"

## 주요 기능

- API 선택 및 파라미터 입력 (Form/Code 뷰 전환)
- Path, Query, Body 파라미터 지원
- RIC 환경 전환 (KIC/AIC/EIC)
- Request Header 편집
- cURL 명령어 자동 생성 및 복사
- 더미 응답 모드 지원

## 프로젝트 구조

```
api-explorer/
├── index.html          # 메인 HTML
├── css/
│   └── style.css       # 스타일시트
├── js/
│   ├── config.js       # 환경 설정
│   └── app.js          # 메인 로직
└── data/
    ├── api-list.json   # API 목록
    └── api-detail.json # API 상세 정보
```

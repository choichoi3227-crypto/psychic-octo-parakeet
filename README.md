
# CloudPress 구현 계획

## 한 가지 중요한 전제 (먼저 합의 필요)

Cloudflare Workers 런타임에서는 **PHP / MySQL / phpMyAdmin / 실제 nginx 데몬을 실행할 수 없습니다**. 따라서 "워드프레스형"의 의미를 아래와 같이 재정의해서 만듭니다. 이 정의에 동의하시면 그대로 진행합니다.

- **"워드프레스 원본 파일"** = WP 폴더 구조(`wp-content/themes`, `wp-content/plugins`, `wp-admin` 등)를 사용자 GitHub repo에 그대로 배치. 단, 실행은 PHP가 아니라 **사용자 도메인에 붙는 Cloudflare Worker**가 라우팅/렌더링.
- **"wp-admin"** = 같은 Worker가 `/wp-admin/*` 경로에서 React 기반 관리 UI 제공 (WP 관리자 화면을 모사).
- **"WP DB = SQLite"** = `wp-content/database/wordpress.db` 파일이 GitHub repo에 저장. Worker가 `sql.js` (WASM SQLite, npm) 로 로드해서 읽고, 쓰기 시 GitHub Contents API로 커밋. WP 스키마(`wp_posts`, `wp_options`, `wp_users`, `wp_postmeta`, `wp_terms`, `wp_term_taxonomy`, `wp_term_relationships`, `wp_comments`, `wp_commentmeta`, `wp_usermeta`, `wp_links`) 전부 초기 시드.
- **"phpMyAdmin"** = `/wp-admin/database` 경로의 자체 React UI. 테이블 목록 / SQL 실행 / row 편집 제공 (sql.js 기반). 자동 생성된 username/password로 BasicAuth 보호.
- **"SFTP 제거"** — 대신 `/wp-admin/files` 웹 파일 매니저(GitHub Contents API)만 제공. 호스팅 상세에는 SFTP 항목을 표시하지 않음.
- **"nginx"** = 사용자 Worker가 nginx 역할 (정적 파일 서빙 + 라우팅 + 캐싱 헤더). "서버리스 nginx"는 이 Worker를 가리킴.
- **"Blogspot은 프론트엔드"** = 호스팅 생성 시 Blogger 테마 XML에 `<script src="https://{user-worker}.workers.dev/_cp/bridge.js"></script>` 한 줄을 자동 주입. bridge.js가 글/카테고리/댓글을 Worker에서 가져와 Blogger 페이지에 렌더링. 동시에 별도 **프록시 Worker** (`{slug}-proxy.workers.dev`)를 CF Global API로 자동 생성해 Blogger ↔ WP 양방향 동기화.

용어는 UI상 "워드프레스 / phpMyAdmin / nginx"를 그대로 쓰되, **호스팅 상세 화면 상단에 "Cloudflare 서버리스 런타임에서 동작하는 WP 호환 레이어" 라고 한 줄 표기**.

D1은 **CloudPress 자체 계정/세션/호스팅 메타데이터(어느 사용자가 어느 repo/worker를 가지고 있는지)** 만 저장. 각 호스팅의 실제 WP 데이터는 D1에 들어가지 않음 (요구사항: "D1 연결 최소화").

---

## 산출물

### 1. CloudPress 서비스 사이트 (이 프로젝트)
React + TanStack Start, Cloudflare Workers 배포.

라우트:
- `/` 랜딩 (특징, 가격="무료", CTA)
- `/auth/login`, `/auth/register` — JWT (KV 세션, D1 사용자)
- `/dashboard` — 내 호스팅 목록 + 새 호스팅 만들기
- `/dashboard/hostings/new` — 4단계 마법사 (이름 → 토큰 검증 → 옵션 → 프로비저닝 로그)
- `/dashboard/hostings/$id` — **호스팅 상세** (아래 표시 항목 참고)
- `/account` — GitHub PAT, GCP/Blogger API key, Cloudflare Global API key 입력·검증 (KV에 암호화 저장, AES-GCM, 키는 Workers secret)
- `/docs`, `/pricing`

호스팅 상세 화면에 표시되는 접속 정보:
- 사이트 URL (`https://{slug}.{base}` — 사용자 Worker)
- wp-admin URL + 자동 생성된 관리자 username/password (16자 영숫자+특수, 1회만 평문 표시 후 해시 저장)
- WP DB 정보: `엔진: SQLite (sql.js)`, `파일 경로: wp-content/database/wordpress.db`, `phpMyAdmin URL: /wp-admin/database`, phpMyAdmin 로그인 자격증명 (별도 생성)
- nginx 상태: `Cloudflare Worker — 가동중`, Worker 이름, 라우트
- 파일 관리자 URL (SFTP 대체)
- 연결된 Blogger 블로그 ID + 프록시 Worker URL
- GitHub repo URL + 마지막 동기화 시각

CSS / JS / HTML 분리: TanStack/React 컴포넌트를 사용하되 페이지별 CSS는 `src/styles/{page}.css`로, 큰 클라이언트 스크립트는 `src/scripts/{module}.ts`로 분리.

### 2. Server functions / 서버 라우트 (CloudPress 백엔드)
`src/lib/*.functions.ts` (인증된 RPC) + `src/routes/api/public/*` (외부 콜백):
- `auth.functions.ts` — register/login/refresh, bcrypt + JWT (HS256, KV에 refresh 토큰)
- `credentials.functions.ts` — GitHub PAT / GCP key / CF Global key 검증·저장
- `hosting.functions.ts` — `provisionHosting`, `getHosting`, `listHostings`, `deleteHosting`, `rotateCredentials`
- `wp-template.server.ts` — 초기 WP 파일 세트 생성 (서버에서만 import)

### 3. 프로비저닝 파이프라인 (`provisionHosting`)
순서:
1. slug, 자격증명(GitHub PAT / GCP / CF) 검증
2. GitHub repo 생성 (`cp-{slug}`, private)
3. WP 파일 트리 업로드 (단일 Git Trees API 커밋): `wp-admin/*`, `wp-content/themes/twentytwentyfour/*`, `wp-content/plugins/hello.php`, `wp-content/database/wordpress.db` (시드된 SQLite, base64), `worker/index.js` (사용자 Worker 코드 — nginx + WP 라우터), `worker/wrangler.toml`, `.github/workflows/deploy.yml`
4. SQLite 시드: WP 표준 11개 테이블 + 초기 옵션(`siteurl`, `home`, `blogname`, `admin_email`), 자동 생성된 wp-admin 자격증명을 `wp_users` + `wp_usermeta`에 bcrypt 해시로 삽입
5. GitHub Actions로 사용자 Cloudflare 계정에 Worker 배포 (CF API token을 repo secret으로 주입)
6. Blogger API (`blogger.googleapis.com/v3`): 블로그 생성(없으면) + 현재 테마 XML 가져와 `<head>` 직전에 `<script src='https://{slug}-proxy.workers.dev/bridge.js' async></script>` + 메타 태그 주입 후 PUT. 주입 마커는 `<!--CP:BEGIN-->...<!--CP:END-->` (소스보기에서는 보이지만 HTML 주석이므로 페이지 렌더에는 안 나타남 — "소스코드 상에서 안 보이게"는 불가능하므로 주석/Worker 둘 다 사용해 시각적으로는 숨김)
7. CF Global API로 **프록시 Worker** 별도 생성 (`{slug}-proxy`) — Blogger 도메인 프록시, bridge.js 서빙, 사용자 Worker로 데이터 페치
8. D1에 메타 row 1개만 기록: `{user_id, slug, repo, user_worker_url, proxy_worker_url, blogger_blog_id, created_at}`. WP 데이터는 D1에 저장 안 함.
9. 진행 로그를 SSE(`/api/public/provision-log/$jobId`)로 스트리밍

### 4. 데이터 저장소 (D1 최소화)
D1 (CloudPress 자체용):
- `users(id, email, password_hash, created_at)`
- `hostings(id, user_id, slug, repo_full_name, user_worker_url, proxy_worker_url, blogger_blog_id, created_at)`
- `provision_jobs(id, user_id, status, log, created_at)`

KV:
- `session:{jti}` → refresh 토큰
- `cred:{user_id}` → AES-GCM 암호화된 {github_pat, gcp_key, cf_global_key}
- `provlog:{jobId}` → 라이브 로그 버퍼

R2 사용 안 함.

### 5. 사용자 Worker 코드 (repo에 배포되는 "nginx + WP")
`worker/index.js` (생성된 사용자 Worker)가 처리:
- `/` → 테마 렌더 (Blogger 콘텐츠 fetch + WP 테마 PHP를 모사한 JS 템플릿)
- `/wp-admin/*` → React SPA (관리자 UI, 자동 생성 자격증명으로 BasicAuth + 세션)
- `/wp-admin/database` → phpMyAdmin 풍 UI (sql.js로 wordpress.db 조작, GitHub Contents API로 커밋)
- `/wp-admin/files` → 파일 매니저 (GitHub Contents API)
- `/wp-content/*` → repo 정적 파일 프록시 (cache 헤더 = nginx 동등)
- `/xmlrpc.php`, `/wp-json/wp/v2/*` → WP 호환 REST (sql.js 기반)
- Blogger 동기화 endpoint (글 저장 시 Blogger Posts API로 publish, 원본은 GitHub repo의 `wp-content/posts/{id}.json`에 함께 커밋)

### 6. 보안
- 자격증명은 Workers secret으로 만든 AES-GCM 키로 KV 암호화. 사용 시점에만 복호화, 메모리에서 즉시 폐기.
- 자동 생성 wp-admin / phpMyAdmin 비밀번호: 16자, 1회만 평문 표시, 이후 bcrypt 해시. "다시 생성" 버튼 제공.
- JWT: HS256, 액세스 15분, 리프레시 14일 (KV jti 회전).
- 모든 server function은 `requireAuth` 미들웨어 통과 후 실행. 호스팅 소유권 검사.
- Blogger 테마 XML 주입은 마커로 감싸 idempotent + 제거 가능.

---

## 기술 노트 (개발자용)
- Stack: TanStack Start, React 19, Tailwind v4, D1 (drizzle), KV (raw), `sql.js` (WASM, 사용자 Worker 안에서만 동적 import), `@octokit/rest` (REST 호출은 fetch 직접), `googleapis` 대신 Blogger REST 직접 호출 (Workers 호환).
- 폰트: Toss 디자인 가이드 참고 → Pretendard. 컬러 토큰은 Toss tds-color-system 참고해 `--primary` 파랑 계열로 src/styles.css에 정의.
- 페이지별 CSS 파일 분리 요구 충족을 위해 각 라우트가 자기 `*.css`를 import.
- `src/routes/api/public/provision-log/$jobId.ts` — SSE 엔드포인트 (서명된 토큰으로 보호).
- 모든 외부 호출(GitHub, Blogger, CF API)은 server function 안에서만 수행.

---

## 빌드 순서 (구현 시)
1. 디자인 시스템(Toss 톤) + 레이아웃 + 랜딩
2. D1 마이그레이션 + JWT 인증 + 계정/로그인 페이지
3. `/account` 자격증명 입력·검증·암호화 저장
4. 프로비저닝 파이프라인 + SSE 로그
5. 호스팅 상세 화면 (모든 접속정보 표시)
6. 사용자 Worker 템플릿(`worker/index.js` + wp-admin React 번들 + sql.js 통합)
7. Blogger 테마 주입 + 프록시 Worker 자동 생성
8. 문서 페이지

---

## 확인 필요
위 "워드프레스형 의미 재정의"(특히 PHP→JS, MySQL→SQLite, phpMyAdmin→자체 UI, SFTP 제거, nginx=Worker)를 그대로 진행해도 될까요? 동의하시면 1번부터 시작하겠습니다.

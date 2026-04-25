# 낚시몰 (Fishing Mall)

Next.js 14 + TypeScript + PostgreSQL(Prisma) + TailwindCSS 기반의 한국형 낚시용품 쇼핑몰 보일러플레이트입니다.

## 주요 기능

- 상품 카탈로그 (카테고리/검색/정렬/페이지네이션)
- 상품 상세, 장바구니 (Zustand + localStorage 영속화)
- 회원가입 / 로그인 (NextAuth Credentials)
- 주문/결제 플로우 (3사 PG 연동)
  - 토스페이먼츠 (TossPayments)
  - KG이니시스 (INIStdPay)
  - 네이버페이 (NaverPay v2)
- 마이페이지 - 주문 내역 조회
- 관리자 시드 데이터: 카테고리 자동 생성 + 샘플 상품 300개

## 기술 스택

- **Frontend**: Next.js 14 (App Router), React 18, TailwindCSS
- **Backend**: Next.js Route Handlers
- **DB / ORM**: PostgreSQL + Prisma
- **Auth**: NextAuth (Credentials Provider)
- **State**: Zustand (장바구니)
- **Validation**: Zod

## 빠른 시작

### 1. 의존성 설치
```bash
npm install
```

### 2. PostgreSQL 준비
로컬 PostgreSQL 또는 Supabase / Neon / Railway 등 클라우드 DB 사용 가능.

### 3. 환경변수 설정
`.env.example` 을 `.env` 로 복사 후 값 입력:
```bash
cp .env.example .env
```

필수 항목:
- `DATABASE_URL` - PostgreSQL 연결 문자열
- `NEXTAUTH_SECRET` - `openssl rand -base64 32` 으로 생성
- `TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY` - 토스페이먼츠 키
- `INICIS_MID`, `INICIS_SIGN_KEY` - KG이니시스 키
- `NAVERPAY_CLIENT_ID`, `NAVERPAY_CLIENT_SECRET`, `NAVERPAY_CHAIN_ID` - 네이버페이 키

### 4. DB 마이그레이션 + 시드
```bash
npm run db:push      # 스키마 적용
npm run db:seed      # 카테고리 + 샘플 상품 300개 생성
```

### 5. 개발 서버 실행
```bash
npm run dev
```
http://localhost:3000 접속

## 프로젝트 구조

```
fishing-mall/
├── prisma/
│   ├── schema.prisma          # DB 스키마 (User, Category, Product, Order, ...)
│   └── seed.ts                # 샘플 데이터 시드
├── src/
│   ├── app/
│   │   ├── layout.tsx         # 루트 레이아웃 (헤더/푸터/세션)
│   │   ├── page.tsx           # 홈 (히어로 + 추천 + 신상품)
│   │   ├── products/
│   │   │   ├── page.tsx       # 상품 목록 (검색/필터/정렬)
│   │   │   └── [id]/page.tsx  # 상품 상세
│   │   ├── cart/page.tsx      # 장바구니
│   │   ├── checkout/page.tsx  # 주문/결제
│   │   ├── login, register, mypage
│   │   └── api/
│   │       ├── auth/...       # NextAuth
│   │       ├── orders/        # 주문 생성
│   │       └── payments/      # PG 콜백
│   │           ├── toss/confirm/
│   │           ├── inicis/prepare, return/
│   │           └── naver/reserve, return/
│   ├── components/            # Header, Footer, ProductCard, ...
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   ├── utils.ts
│   │   └── payments/toss-client.ts
│   └── store/cart.ts          # Zustand 장바구니 스토어
└── public/images/
```

## 결제 흐름 요약

1. 사용자가 `/checkout` 에서 주소/결제수단 입력 후 [결제하기] 클릭
2. `POST /api/orders` → DB에 `Order` 를 `PENDING` 상태로 생성 (서버에서 금액 재계산)
3. 선택한 PG에 따라 분기:
   - **토스**: 클라이언트에서 SDK 로 결제창 호출 → `/api/payments/toss/confirm` 에서 시크릿키로 승인
   - **이니시스**: `/api/payments/inicis/prepare` 로 서명 생성 → INIStdPay 결제창 → `/api/payments/inicis/return` 에서 승인 API 호출
   - **네이버페이**: `/api/payments/naver/reserve` 로 예약 → 결제창 → `/api/payments/naver/return` 에서 승인
4. 승인 성공시: 주문 상태 `PAID`, 재고 차감, `/checkout/success` 로 리다이렉트
5. 실패시: `/checkout/fail` 로 이동, 망취소 처리

### 보안 체크리스트

- [x] 결제금액 서버측 재계산 (클라이언트 금액 신뢰 X)
- [x] PG 콜백시 DB 주문번호 + 금액 일치 검증
- [x] 트랜잭션으로 주문 상태 + 재고 차감 원자 처리
- [ ] (운영시) HTTPS 필수
- [ ] (운영시) PG webhook 별도 등록하여 중복 검증 권장
- [ ] (운영시) `INIStdPay.js` 스크립트는 운영 도메인 등록 후 head 에 로드

## 토스페이먼츠 테스트

테스트 클라이언트키를 `.env` 에:
```
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_docs_Ovk5rk1EwkEbP0W43n07xlzm
TOSS_SECRET_KEY=test_sk_docs_OaPz8L5KdmQXkzRz3y47BMw6
```
테스트 카드 번호는 토스 공식 문서 참고.

## 이니시스 테스트

테스트 MID/SignKey 는 이미 `.env.example` 에 들어있습니다 (이니시스 공개 테스트 계정).
실제 운영시 가맹점 계약 후 발급받은 키로 교체하세요.

운영용 결제창 호출을 위해서는 `/_document` 또는 `app/layout.tsx`의 `<head>` 에 다음 스크립트를 추가하세요:
```html
<script src="https://stdpay.inicis.com/stdjs/INIStdPay.js"></script>
```

## 네이버페이

- 개발자센터 가입 후 가맹점 등록 → `chainId`, `clientId`, `clientSecret` 발급
- 테스트는 `dev-pub.apis.naver.com` 도메인 사용 (코드에 반영됨)
- 운영 전환시 도메인을 `apis.naver.com` 으로 교체

## 부가 기능 (구현 완료)

### 다음 우편번호 검색
- `src/components/AddressSearch.tsx` 컴포넌트
- 카카오(다음) Postcode API — 무료, 키 발급 불필요
- 체크아웃 페이지에서 자동 우편번호 + 도로명 주소 채움

### 택배 추적 (스마트택배 / SweetTracker)
- `src/lib/tracker.ts`, `/api/tracking?courier=...&invoice=...`
- 관리자 주문 상세에서 자동 조회 + 새로고침
- 고객 페이지 `/orders/[orderNo]/tracking` 에서도 조회
- API 키: https://info.sweettracker.co.kr/apikey 에서 발급 → `.env`의 `SWEETTRACKER_API_KEY`

### 상품 일괄 등록 (엑셀 / CSV)
- `/admin/products/bulk`
- **엑셀(.xlsx)** 과 **CSV** 양쪽 모두 지원
- **3-시트 엑셀 템플릿** 다운로드: 안내 / 상품등록 / 카테고리목록
- 한글 컬럼 헤더(상품명, 판매가 등) 또는 영문 키(name, price 등) **모두 인식**
- SKU(상품코드)가 이미 있으면 자동 수정, 없으면 신규 등록
- 행별 검증 → 미리보기에서 신규/수정/오류 색상 구분 → 일괄 처리
- 검증 실패행만 모아서 별도 엑셀로 다운로드 가능 (수정 후 재업로드)
- 한 번에 최대 2,000행 처리

### 매출 대시보드 (Recharts)
- `/admin` 페이지 상단에 최근 30일 일별 매출(라인) + 주문수(바) 차트
- 재고 부족 위젯 동시 표시

### 재고 부족 알림 (이메일 + Slack)
- 글로벌 임계치(`LOW_STOCK_THRESHOLD`) 또는 상품별 개별 임계치
- 결제 완료 후 임계치 도달시 자동 알림 (비동기)
- `/admin/stock` 에서 수동 일괄 알림 가능
- Cron으로 호출하려면: `POST /api/admin/stock/check`, 헤더 `x-cron-token: ${NOTIFY_CRON_TOKEN}`

## 운영 환경 추가 환경변수

```bash
# 스마트택배
SWEETTRACKER_API_KEY=

# 재고 알림
LOW_STOCK_THRESHOLD=10
ADMIN_NOTIFY_EMAIL=admin@example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...     # Gmail은 앱 비밀번호 사용
SMTP_FROM="낚시몰 <noreply@example.com>"

# Slack (선택)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Cron 호출용 토큰
NOTIFY_CRON_TOKEN=random-32-byte-string
```

## 다음 단계로 추가하면 좋은 기능

- [ ] 상품 옵션 (색상/사이즈 조합 SKU)
- [ ] 쿠폰 / 적립금 시스템
- [ ] 상품 리뷰 작성/평점
- [ ] 위시리스트
- [ ] 소셜 로그인 (네이버/카카오)
- [ ] SMS 알림 (가입/주문/배송) — NHN Cloud SMS 또는 알리고
- [ ] 카카오 알림톡 연동
- [ ] 매출 정산 리포트 (월별 엑셀 다운로드)

## 라이선스

MIT — 자유롭게 수정/사용 가능합니다.

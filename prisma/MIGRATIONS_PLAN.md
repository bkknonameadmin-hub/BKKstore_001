# Prisma 마이그레이션 계획

이번 보안 강화 작업으로 추가/변경된 스키마와 필요한 마이그레이션 절차를 정리합니다.

## 1. 새 모델 (이번 변경)

다음 모델이 `schema.prisma`에 추가되었습니다.

| 모델 | 목적 |
|---|---|
| `PasswordResetToken` | 비밀번호 재설정 이메일 토큰 (1시간, 1회용) |
| `ConsentLog` | 약관/개인정보/마케팅 동의 기록 (전자상거래법·개인정보보호법 입증용) |
| `DataExportRequest` | 회원 본인 데이터 export 요청 (개인정보보호법 접근권 대응) |

### 마이그레이션 명령

```bash
# 1) Prisma Client 재생성
npx prisma generate

# 2) DB 마이그레이션
npx prisma migrate dev --name security_hardening_2026_05

# 3) 운영 배포 시
npx prisma migrate deploy
```

> Windows에서 dev 서버 실행 중이면 query engine DLL이 잠겨 generate가 실패합니다. dev 서버를 잠시 내리고 실행하세요.

## 2. 평문 PII 컬럼 단계적 제거 (P1-8)

현재 `User`, `Order`, `Address`, `PhoneVerification` 모델에 **평문**과 **암호화/해시**가 동시에 저장되고 있습니다 ("호환" 주석).
DB dump 또는 SQL injection 시 즉시 노출되므로 단계적 제거가 필요합니다.

### 대상 컬럼

| 모델 | 평문 컬럼 | 대체재 | 비고 |
|---|---|---|---|
| `User.phone` | `phoneEnc`(AES-256-GCM) + `phoneHash`(검색용) | "호환용" 주석 |
| `Order.phone` | `phoneEnc` | 결제/배송 안내용 — 발송 시점에만 일시 복호화 |
| `Order.recipient` | (현재 평문만) | **새 `recipientEnc` 추가 필요** |
| `Order.address1/address2` | (현재 평문만) | **새 `addressEnc` 추가 필요** |
| `Address.phone/recipient/address1/address2` | (`phoneEnc`만 부분적용) | 동일 |
| `PhoneVerification.phone` | `phoneHash` | 24시간 후 cleanup cron으로 삭제 (구현됨) |

### 단계별 절차 (운영 데이터 보존 + 무중단)

**Stage 1: 신규 암호화 컬럼 추가 + 백필**
```sql
ALTER TABLE "Order" ADD COLUMN "recipientEnc" TEXT;
ALTER TABLE "Order" ADD COLUMN "address1Enc"  TEXT;
ALTER TABLE "Order" ADD COLUMN "address2Enc"  TEXT;
ALTER TABLE "Address" ADD COLUMN "recipientEnc" TEXT;
ALTER TABLE "Address" ADD COLUMN "address1Enc"  TEXT;
ALTER TABLE "Address" ADD COLUMN "address2Enc"  TEXT;
```
백필 스크립트(`scripts/backfill-pii.ts`)로 평문 → 암호문 채우기. 운영에서는 작은 배치로 야간 실행.

**Stage 2: 코드 전환**
- 모든 read 경로가 `Enc` 컬럼을 우선 복호화하도록 수정 (호환 fallback 유지)
- write 경로는 `Enc`만 채우고 평문은 `null`로 (당분간)

**Stage 3: 평문 컬럼 read 제거**
- 코드에서 평문 컬럼 참조 0건임을 grep으로 확인

**Stage 4: 평문 컬럼 drop**
```sql
ALTER TABLE "Order" DROP COLUMN "phone";
ALTER TABLE "Order" DROP COLUMN "recipient";
ALTER TABLE "Order" DROP COLUMN "address1";
ALTER TABLE "Order" DROP COLUMN "address2";
-- User.phone, Address.* 동일
```
스키마 rename 후 `npx prisma migrate dev --name drop_plaintext_pii`.

### 키 회전 (KEK→DEK 패턴, 후속 작업)

현재 `ENCRYPTION_KEY` 단일 키. 운영 안정화 후 다음 패턴 권장:
- KEK(Key Encryption Key)는 Vault/KMS에 보관
- DEK(Data Encryption Key)는 DB에 KEK로 암호화하여 저장
- 키 ID(`kid`)를 암호문 prefix에 기록하여 회전 호환

## 3. retention cron 등록

`/api/cron/cleanup` 라우트가 추가되었습니다. Vercel Cron 또는 외부 스케줄러에 1일 1회 등록:

```json
// vercel.json
{
  "crons": [
    { "path": "/api/cron/cleanup",         "schedule": "0 17 * * *" },
    { "path": "/api/cron/expire-pending",  "schedule": "*/5 * * * *" },
    { "path": "/api/cron/dormant-users",   "schedule": "0 16 * * *" }
  ]
}
```
헤더 `Authorization: Bearer ${CRON_SECRET}` 또는 `x-cron-token: ${CRON_SECRET}` 필수.
환경 변수 `LOGIN_LOG_RETENTION_DAYS` 로 LoginLog 보존기간 조정(기본 180).

## 4. 환경변수 추가/필수화

| 변수 | 변경 사항 |
|---|---|
| `ENCRYPTION_KEY` | **모든 환경 필수**. 미설정시 부팅 실패. `openssl rand -hex 32` |
| `CRON_SECRET` | **모든 환경 필수** (cron 라우트 호출 시) |
| `TOSS_WEBHOOK_SECRET` | 운영 필수 (미설정시 503) |
| `INICIS_SIGN_KEY` | 운영 필수 (미설정시 503), 테스트키 fallback 제거됨 |
| `INICIS_API_KEY`, `INICIS_API_PWD` | 환불 자동화에 필요 (선택, 없으면 환불 라우트가 503) |
| `INICIS_NOTIFY_ALLOWED_IPS` | INI 노티 IP allowlist (선택, 콤마 구분) |
| `ALLOWED_ORIGINS` | CSRF 허용 출처 (콤마 구분, 운영 도메인 외 추가용) |
| `IMAGE_REMOTE_HOSTS` | next/image 추가 도메인 (콤마 구분) |
| `LOGIN_LOG_RETENTION_DAYS` | LoginLog 보존(기본 180) |

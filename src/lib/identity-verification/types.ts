/**
 * 본인확인기관 어댑터 공통 인터페이스
 *
 * provider 종류와 무관하게 동일한 시그니처로 호출하기 위한 추상화.
 * 운영 도입 시점에 .env 의 IDENTITY_PROVIDER 값으로 교체.
 */

export type IdentityPurpose =
  | "find-id"        // 아이디 찾기
  | "find-password"  // 비밀번호 찾기
  | "register"       // 회원가입 본인확인
  | "reverify";      // 재인증 (보안 민감 작업)

export type IdentityProviderName = "nice" | "kcb" | "kcp" | "mock";

/** 클라이언트가 본인확인기관 팝업/리다이렉트로 보내는 데 필요한 정보 */
export type StartResult = {
  /** 우리 DB 의 IdentityVerification.id (콜백/조회용) */
  verificationId: string;
  /** 본인확인기관에 전달한 요청 시퀀스 */
  reqSeq: string;
  /**
   * 클라이언트가 호출해야 할 형식.
   * - 'redirect': location.href = url
   * - 'popup': window.open(url, ...) + postMessage 콜백
   * - 'form-mock': 개발용 — 모의 인증 폼 노출
   */
  mode: "redirect" | "popup" | "form-mock";
  /** redirect/popup 모드에서 사용할 URL */
  url?: string;
  /** form-post 가 필요한 경우 (NICE 일부 모드) */
  formData?: Record<string, string>;
};

/** 본인인증 결과 (consumed 후 클라이언트에 노출 가능한 부분만) */
export type CompletedVerification = {
  id: string;
  reqSeq: string;
  provider: IdentityProviderName;
  purpose: IdentityPurpose;
  ci: string;
  di: string;
  name: string;
  birthDate: string;   // YYYYMMDD
  phone: string;       // 010XXXXXXXX
  gender: "M" | "F" | null;
  nationality: "L" | "F" | null;
};

export interface IdentityProvider {
  readonly name: IdentityProviderName;

  /**
   * 인증 시작 — provider 호출용 reqSeq 생성, encData 준비
   * IdentityVerification 레코드를 PENDING 상태로 DB에 저장한 뒤 반환
   */
  start(args: {
    purpose: IdentityPurpose;
    /** provider 가 콜백을 보낼 우리 사이트 URL (return route) */
    returnUrl: string;
    ip: string | null;
    userAgent: string | null;
  }): Promise<StartResult>;

  /**
   * provider 콜백 처리 — 응답 복호화, IdentityVerification 을 COMPLETED 로 업데이트
   * 반환값: verificationId (또는 실패 시 null)
   *
   * 콜백 형태가 provider 마다 다름:
   * - NICE: POST formData (encData)
   * - KCB: GET query (token)
   * - mock: GET query (verificationId + name + birth + phone)
   */
  handleReturn(args: {
    method: "GET" | "POST";
    query: Record<string, string>;
    body?: Record<string, string>;
  }): Promise<
    | { ok: true; verificationId: string }
    | { ok: false; error: string; verificationId?: string }
  >;
}

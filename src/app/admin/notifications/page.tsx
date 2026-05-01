import Link from "next/link";
import { ALIMTALK_TEMPLATES, type TemplateKey } from "@/lib/alimtalk";
import TestSendForm from "./TestSendForm";

export const dynamic = "force-dynamic";

const KEY_LABEL: Record<TemplateKey, { label: string; trigger: string; color: string }> = {
  ORDER_PAID:        { label: "주문/결제 완료",   trigger: "결제 완료시 자동",         color: "bg-blue-50 text-blue-700" },
  SHIPPING_STARTED:  { label: "배송 시작",         trigger: "관리자 → 발송 처리시 자동", color: "bg-indigo-50 text-indigo-700" },
  DELIVERY_COMPLETED:{ label: "배송 완료",         trigger: "관리자 → 배송완료시 자동", color: "bg-emerald-50 text-emerald-700" },
  ORDER_CANCELLED:   { label: "주문 취소",         trigger: "관리자 → 취소시 자동",     color: "bg-red-50 text-red-600" },
  ORDER_REFUNDED:    { label: "환불 완료",         trigger: "관리자 → 환불시 자동",     color: "bg-purple-50 text-purple-700" },
};

const isProviderConfigured =
  !!process.env.ALIMTALK_API_KEY &&
  !!process.env.ALIMTALK_USER_ID &&
  !!process.env.ALIMTALK_SENDER_KEY;

export default function AdminNotificationsPage() {
  return (
    <div className="space-y-4">
      <nav className="text-xs text-gray-500">
        <Link href="/admin" className="hover:text-brand-600">관리자</Link>
        <span className="mx-1">›</span>
        <span className="text-gray-700">알림 관리</span>
      </nav>

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold">카카오 알림톡 템플릿</h1>
          <p className="text-xs text-gray-500 mt-1">
            주문/배송 단계별 자동 발송 메시지입니다. 카카오에 사전 등록된 템플릿과 동일해야 발송됩니다.
          </p>
        </div>
        <span className={`px-3 py-1.5 rounded text-xs font-bold ${
          isProviderConfigured
            ? "bg-emerald-50 text-emerald-700"
            : "bg-amber-50 text-amber-700"
        }`}>
          {isProviderConfigured ? "✓ 발송 활성화됨" : "⚠ 콘솔 모드 (환경변수 미설정)"}
        </span>
      </div>

      {!isProviderConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded p-4 text-xs text-amber-800 leading-relaxed">
          <p className="font-bold mb-1">현재 카카오 알림톡 발송이 비활성 상태입니다.</p>
          <p>아래 환경변수를 설정하시면 실제 발송됩니다:</p>
          <ul className="list-disc list-inside mt-2 space-y-0.5 font-mono">
            <li>ALIMTALK_API_KEY</li>
            <li>ALIMTALK_USER_ID</li>
            <li>ALIMTALK_SENDER_KEY (카카오 채널 발신 프로필 키)</li>
            <li>ALIMTALK_SENDER (사전등록된 발신번호)</li>
          </ul>
          <p className="mt-2">
            설정 전까지는 콘솔에 메시지가 출력되어 개발/테스트 가능합니다.
          </p>
        </div>
      )}

      <section className="space-y-3">
        {(Object.keys(ALIMTALK_TEMPLATES) as TemplateKey[]).map((key) => {
          const tpl = ALIMTALK_TEMPLATES[key];
          const meta = KEY_LABEL[key];
          // 미리보기용 샘플 변수
          const sample = {
            name: "홍길동", orderNo: "ORD-20260501-XYZ12",
            amount: "85,000", method: "신용카드",
            courier: "CJ대한통운", trackingNo: "1234567890",
          };
          const previewBody = tpl.body(sample);

          return (
            <div key={key} className="bg-white rounded border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${meta.color}`}>{meta.label}</span>
                  <code className="text-xs text-gray-400 font-mono">{tpl.templateCode}</code>
                </div>
                <span className="text-[11px] text-gray-500">{meta.trigger}</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px]">
                {/* 본문 미리보기 */}
                <div className="p-5">
                  <div className="text-[11px] text-gray-400 mb-1">본문 (변수가 적용된 미리보기)</div>
                  <pre className="bg-gray-50 rounded p-3 text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{previewBody}</pre>
                  {tpl.buttons && tpl.buttons.length > 0 && (
                    <div className="mt-3">
                      <div className="text-[11px] text-gray-400 mb-1">버튼</div>
                      <div className="flex gap-2">
                        {tpl.buttons.map((b, i) => (
                          <span key={i} className="text-xs px-3 py-1 rounded border border-gray-300 bg-white">{b.name}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {/* 카톡 말풍선 미리보기 */}
                <div className="p-5 bg-yellow-50 border-l border-gray-100">
                  <div className="text-[11px] text-gray-500 mb-2">카카오톡 미리보기</div>
                  <div className="bg-white rounded-lg shadow-sm p-3 text-xs text-gray-800 whitespace-pre-wrap leading-relaxed border border-yellow-200">
                    <div className="font-bold mb-1.5">{tpl.title}</div>
                    {previewBody}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="bg-white rounded border border-gray-200 p-5">
        <h2 className="font-bold text-sm mb-3">테스트 발송</h2>
        <p className="text-xs text-gray-500 mb-3">
          본인 휴대폰으로 테스트 메시지를 받아보실 수 있습니다.
          (콘솔 모드에서는 서버 콘솔에만 출력됩니다)
        </p>
        <TestSendForm />
      </section>
    </div>
  );
}

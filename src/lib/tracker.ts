// 스마트택배 (SweetTracker) API 연동
// API 키 발급: https://info.sweettracker.co.kr/apikey
// 문서: https://info.sweettracker.co.kr/api/v1/

// 한글 택배사명 → SweetTracker 코드 매핑
// (전체 목록은 GET /api/v1/companylist 에서 받을 수 있음)
const COURIER_CODE: Record<string, string> = {
  "CJ대한통운": "04",
  "한진택배": "05",
  "롯데택배": "08",
  "우체국택배": "01",
  "로젠택배": "06",
  "쿠팡로지스틱스": "46",
};

export type TrackingStep = {
  time: string;       // ISO 시각
  location: string;   // 위치
  status: string;     // 상태 설명
};

export type TrackingResult = {
  carrier: string;
  invoice: string;
  status: "pending" | "delivered" | "in_transit" | "error";
  steps: TrackingStep[];
  receiverName?: string;
  senderName?: string;
  itemName?: string;
  errorMessage?: string;
};

export function getCourierCode(name: string | null | undefined): string | null {
  if (!name) return null;
  return COURIER_CODE[name] ?? null;
}

export async function trackShipment(courierName: string, invoice: string): Promise<TrackingResult> {
  const apiKey = process.env.SWEETTRACKER_API_KEY;
  if (!apiKey) {
    return { carrier: courierName, invoice, status: "error", steps: [], errorMessage: "SWEETTRACKER_API_KEY가 설정되지 않았습니다." };
  }
  const code = getCourierCode(courierName);
  if (!code) {
    return { carrier: courierName, invoice, status: "error", steps: [], errorMessage: `지원하지 않는 택배사: ${courierName}` };
  }

  const url = `https://info.sweettracker.co.kr/api/v1/trackingInfo?t_key=${encodeURIComponent(apiKey)}&t_code=${code}&t_invoice=${encodeURIComponent(invoice)}`;

  try {
    const res = await fetch(url, { next: { revalidate: 300 } }); // 5분 캐시
    const data = await res.json();

    if (data.status === false || data.code) {
      return { carrier: courierName, invoice, status: "error", steps: [], errorMessage: data.msg || "조회 실패" };
    }

    const steps: TrackingStep[] = (data.trackingDetails || []).map((d: any) => ({
      time: d.timeString || d.time || "",
      location: d.where || "",
      status: d.kind || "",
    }));

    const status: TrackingResult["status"] =
      data.complete === true ? "delivered" :
      steps.length === 0 ? "pending" : "in_transit";

    return {
      carrier: courierName,
      invoice,
      status,
      steps,
      receiverName: data.receiverName,
      senderName: data.senderName,
      itemName: data.itemName,
    };
  } catch (e: any) {
    return { carrier: courierName, invoice, status: "error", steps: [], errorMessage: e.message || "네트워크 오류" };
  }
}

"use client";
import { useEffect, useState } from "react";
import type { TrackingResult } from "@/lib/tracker";

const STATUS_LABEL: Record<TrackingResult["status"], string> = {
  pending: "집하 대기",
  in_transit: "배송중",
  delivered: "배송완료",
  error: "조회 실패",
};

const STATUS_COLOR: Record<TrackingResult["status"], string> = {
  pending: "bg-gray-100 text-gray-600",
  in_transit: "bg-indigo-50 text-indigo-700",
  delivered: "bg-green-50 text-green-700",
  error: "bg-red-50 text-red-600",
};

type Props = {
  courier: string;
  invoice: string;
  autoLoad?: boolean;
};

export default function TrackingViewer({ courier, invoice, autoLoad = true }: Props) {
  const [data, setData] = useState<TrackingResult | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tracking?courier=${encodeURIComponent(courier)}&invoice=${encodeURIComponent(invoice)}`);
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setData({ carrier: courier, invoice, status: "error", steps: [], errorMessage: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoLoad && courier && invoice) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courier, invoice]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm">
          <span className="text-gray-500">{courier}</span>
          <span className="mx-2 text-gray-300">|</span>
          <span className="font-mono">{invoice}</span>
          {data && (
            <span className={`ml-3 px-2 py-0.5 rounded text-xs ${STATUS_COLOR[data.status]}`}>
              {STATUS_LABEL[data.status]}
            </span>
          )}
        </div>
        <button onClick={fetchData} disabled={loading} className="text-xs text-brand-600 hover:underline disabled:opacity-50">
          {loading ? "조회 중..." : "🔄 새로고침"}
        </button>
      </div>

      {loading && !data && <p className="text-sm text-gray-500">조회 중입니다...</p>}

      {data?.status === "error" && (
        <p className="text-sm text-red-600">{data.errorMessage || "조회 실패"}</p>
      )}

      {data && data.status !== "error" && (
        <>
          {(data.itemName || data.receiverName) && (
            <dl className="text-xs space-y-1 mb-3 text-gray-600">
              {data.itemName && <div><dt className="inline w-16">상품:</dt><dd className="inline ml-1">{data.itemName}</dd></div>}
              {data.receiverName && <div><dt className="inline w-16">받는분:</dt><dd className="inline ml-1">{data.receiverName}</dd></div>}
              {data.senderName && <div><dt className="inline w-16">보낸분:</dt><dd className="inline ml-1">{data.senderName}</dd></div>}
            </dl>
          )}
          {data.steps.length === 0 ? (
            <p className="text-sm text-gray-500">아직 배송 정보가 등록되지 않았습니다.</p>
          ) : (
            <ol className="relative border-l-2 border-gray-200 ml-2 space-y-3">
              {data.steps.map((s, i) => (
                <li key={i} className="pl-4 relative">
                  <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-brand-500 border-2 border-white" />
                  <div className="text-xs text-gray-400">{s.time}</div>
                  <div className="text-sm font-medium text-gray-800">{s.status}</div>
                  <div className="text-xs text-gray-500">{s.location}</div>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}

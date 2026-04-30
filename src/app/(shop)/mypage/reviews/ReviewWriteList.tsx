"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Item = {
  orderItemId: string;
  productId: string;
  productName: string;
  productThumbnail: string | null;
  variantName: string | null;
  orderNo: string;
  deliveredAt: Date | string | null;
};

export default function ReviewWriteList({ items }: { items: Item[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <ul className="space-y-3">
      {items.map((it) => (
        <li key={it.orderItemId} className="border border-gray-200 rounded bg-white">
          <div className="p-4 flex items-center gap-3">
            <div className="w-16 h-16 rounded bg-gray-100 overflow-hidden border border-gray-100 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.productThumbnail || "/images/placeholder.svg"} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <Link href={`/products/${it.productId}`} className="text-sm font-medium hover:text-brand-600 line-clamp-1">
                {it.productName}
              </Link>
              <div className="text-xs text-gray-500 mt-0.5">
                {it.variantName && <span className="mr-2">옵션: {it.variantName}</span>}
                <span>주문 {it.orderNo}</span>
              </div>
            </div>
            <button
              onClick={() => setOpenId(openId === it.orderItemId ? null : it.orderItemId)}
              className="btn-primary text-xs h-9"
            >
              {openId === it.orderItemId ? "닫기" : "리뷰 작성"}
            </button>
          </div>
          {openId === it.orderItemId && (
            <ReviewWriteForm
              orderItemId={it.orderItemId}
              productId={it.productId}
              onClose={() => setOpenId(null)}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

function ReviewWriteForm({
  orderItemId, productId, onClose,
}: { orderItemId: string; productId: string; onClose: () => void }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (images.length + files.length > 5) {
      alert("최대 5장까지 업로드할 수 있습니다.");
      return;
    }
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const f of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", f);
        const res = await fetch("/api/reviews/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "업로드 실패");
        uploaded.push(data.url);
      }
      setImages((prev) => [...prev, ...uploaded]);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const submit = async () => {
    setErr("");
    if (content.trim().length < 5) { setErr("리뷰는 5자 이상 작성해주세요."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderItemId, productId, rating, content: content.trim(), images }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "작성 실패");
      alert("리뷰가 등록되었습니다. 감사합니다!");
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
      <div>
        <label className="label">평점</label>
        <div className="flex gap-1 text-2xl">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={rating >= n ? "text-amber-400" : "text-gray-300"}
            >★</button>
          ))}
          <span className="ml-2 text-sm text-gray-500 self-center">{rating} / 5</span>
        </div>
      </div>
      <div>
        <label className="label">리뷰 내용</label>
        <textarea
          rows={4} className="input text-sm" maxLength={2000}
          placeholder="실제 사용 경험을 솔직하게 작성해주세요. (5자 이상)"
          value={content} onChange={(e) => setContent(e.target.value)}
        />
        <div className="text-[11px] text-gray-400 mt-1 text-right">{content.length} / 2000</div>
      </div>

      <div>
        <label className="label">사진 첨부 (선택, 최대 5장)</label>
        <div className="flex flex-wrap gap-2 items-start">
          {images.map((src, i) => (
            <div key={i} className="relative w-20 h-20 rounded border border-gray-200 overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs"
                title="삭제"
              >×</button>
            </div>
          ))}
          {images.length < 5 && (
            <label className="w-20 h-20 rounded border border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-brand-500 hover:bg-brand-50 text-xs text-gray-500">
              {uploading ? "업로드..." : "+ 추가"}
              <input
                type="file" accept="image/*" multiple hidden
                onChange={onFile} disabled={uploading}
              />
            </label>
          )}
        </div>
        <p className="text-[11px] text-gray-400 mt-1">JPEG/PNG/WebP, 최대 8MB · 부적절한 사진은 관리자가 숨길 수 있습니다.</p>
      </div>

      {err && <p className="text-xs text-red-500">{err}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-outline text-xs h-9">취소</button>
        <button type="button" onClick={submit} disabled={loading} className="btn-primary text-xs h-9">
          {loading ? "등록 중..." : "리뷰 등록"}
        </button>
      </div>
    </div>
  );
}

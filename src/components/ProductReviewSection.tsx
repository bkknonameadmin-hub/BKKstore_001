"use client";
import { useEffect, useState } from "react";

type Review = {
  id: string;
  rating: number;
  content: string;
  images: string[];
  isVerifiedPurchase: boolean;
  createdAt: string;
  authorName: string;
};

export default function ProductReviewSection({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reviews?productId=${productId}`)
      .then((r) => r.json())
      .then((d) => setReviews(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId]);

  return (
    <section className="mt-14">
      <div className="border-b border-gray-200 mb-6 flex items-center gap-4">
        <h2 className="inline-block px-4 py-3 border-b-2 border-brand-500 font-bold">
          리뷰 {reviews.length > 0 && <span className="text-gray-400">({reviews.length})</span>}
        </h2>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">리뷰를 불러오는 중...</p>
      ) : reviews.length === 0 ? (
        <div className="py-10 text-center text-gray-500 text-sm">
          아직 작성된 리뷰가 없습니다. 첫 번째 리뷰를 남겨보세요!
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {reviews.map((r) => (
            <li key={r.id} className="py-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm">
                  <Stars value={r.rating} />
                  <span className="font-bold">{r.authorName}</span>
                  {r.isVerifiedPurchase && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 font-bold">
                      구매 인증
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(r.createdAt).toLocaleDateString("ko-KR")}
                </span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-line">{r.content}</p>
              {r.images.length > 0 && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {r.images.map((src, i) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img key={i} src={src} alt="" className="w-20 h-20 rounded border border-gray-200 object-cover" />
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="text-amber-400">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n}>{value >= n ? "★" : "☆"}</span>
      ))}
    </span>
  );
}

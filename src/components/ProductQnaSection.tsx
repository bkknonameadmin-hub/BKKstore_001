"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "@/store/toast";

type Qna = {
  id: string;
  authorName: string;
  isPrivate: boolean;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
  isOwner?: boolean;
};

export default function ProductQnaSection({ productId }: { productId: string }) {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<Qna[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);

  const load = () => {
    fetch(`/api/products/${productId}/questions`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setItems(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [productId]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold">상품 Q&A <span className="text-sm font-normal text-gray-500">({items.length})</span></h3>
          <p className="text-xs text-gray-500 mt-0.5">상품에 대한 궁금증을 남겨주세요. 답변은 영업일 기준 1~2일 내 등록됩니다.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (status !== "authenticated") {
              toast.warning("로그인이 필요합니다.", { href: "/login", hrefLabel: "로그인" });
              return;
            }
            setOpenForm((v) => !v);
          }}
          className="btn-primary text-sm"
        >
          {openForm ? "닫기" : "✏ 문의 작성"}
        </button>
      </div>

      {openForm && session?.user && (
        <QnaForm
          productId={productId}
          onPosted={() => { setOpenForm(false); setLoading(true); load(); }}
          onCancel={() => setOpenForm(false)}
        />
      )}

      {loading ? (
        <div className="py-10 text-center text-gray-400 text-sm">불러오는 중...</div>
      ) : items.length === 0 ? (
        <div className="py-10 text-center text-gray-500 border border-dashed border-gray-200 rounded-lg">
          <div className="text-3xl mb-2">💬</div>
          <p className="text-sm">아직 문의가 없습니다. 첫 문의를 남겨보세요.</p>
        </div>
      ) : (
        <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white">
          {items.map((q) => <QnaRow key={q.id} q={q} />)}
        </ul>
      )}
    </div>
  );
}

function QnaForm({
  productId, onPosted, onCancel,
}: { productId: string; onPosted: () => void; onCancel: () => void }) {
  const [question, setQuestion] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (question.trim().length < 5) { toast.warning("5자 이상 입력해주세요."); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), isPrivate }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "등록 실패");
      toast.success("문의가 등록되었습니다.");
      onPosted();
    } catch (e: any) {
      toast.error(e.message || "등록 실패");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="궁금하신 점을 자세히 적어주세요. (5~2000자)"
        className="input"
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
          <span>🔒 비공개로 작성 (작성자/관리자만 볼 수 있음)</span>
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="btn-outline text-sm">취소</button>
          <button type="button" onClick={submit} disabled={submitting} className="btn-primary text-sm">
            {submitting ? "등록 중..." : "등록"}
          </button>
        </div>
      </div>
    </div>
  );
}

function QnaRow({ q }: { q: Qna }) {
  const [open, setOpen] = useState(false);
  const date = new Date(q.createdAt).toLocaleDateString("ko-KR");

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
      >
        <span className={`shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
          q.answer ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
        }`}>{q.answer ? "답변" : "Q"}</span>
        <span className="flex-1 min-w-0">
          <span className="text-sm text-gray-800 truncate block">
            {q.isPrivate && <span className="mr-1 text-rose-500">🔒</span>}
            {q.question}
          </span>
          <span className="text-[11px] text-gray-400">
            {q.authorName} · {date}{q.isOwner ? " · 내 문의" : ""}
          </span>
        </span>
        <span className={`shrink-0 text-gray-300 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="bg-gray-50/50 px-4 py-3 border-t border-gray-100 space-y-3 animate-fade-in">
          <div className="flex items-start gap-3">
            <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-50 text-brand-600 text-xs font-bold">Q</span>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{q.question}</p>
          </div>
          {q.answer ? (
            <div className="flex items-start gap-3 pt-3 border-t border-gray-100">
              <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">A</span>
              <div className="flex-1">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{q.answer}</p>
                {q.answeredAt && (
                  <p className="text-[11px] text-gray-400 mt-1">{new Date(q.answeredAt).toLocaleDateString("ko-KR")} 답변</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">아직 답변이 등록되지 않았습니다.</p>
          )}
        </div>
      )}
    </li>
  );
}

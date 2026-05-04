"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { toast } from "@/store/toast";
import { FAQ_CATEGORIES } from "@/lib/cms";

type Faq = {
  id?: string;
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
  isPublished: boolean;
};

export default function FaqForm({ initial }: { initial?: Faq }) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const [form, setForm] = useState<Faq>(initial || {
    category: "ETC",
    question: "",
    answer: "",
    sortOrder: 0,
    isPublished: true,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const set = <K extends keyof Faq>(k: K, v: Faq[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.question.trim()) { toast.warning("질문을 입력해주세요."); return; }
    if (!form.answer.trim()) { toast.warning("답변을 입력해주세요."); return; }

    setSaving(true);
    try {
      const url = isEdit ? `/api/admin/faq/${initial!.id}` : "/api/admin/faq";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      toast.success(isEdit ? "수정되었습니다." : "FAQ가 등록되었습니다.");
      router.push("/admin/faq");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!isEdit || !confirm("정말 삭제하시겠습니까?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/faq/${initial!.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "삭제 실패");
      toast.success("삭제되었습니다.");
      router.push("/admin/faq");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "삭제 실패");
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">카테고리</label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)} className="input">
              {FAQ_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">정렬 순서</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => set("sortOrder", parseInt(e.target.value || "0", 10) || 0)}
              className="input"
            />
            <p className="text-[11px] text-gray-400 mt-1">숫자가 작을수록 먼저 노출됩니다.</p>
          </div>
        </div>

        <div>
          <label className="label">질문 *</label>
          <input
            type="text"
            value={form.question}
            onChange={(e) => set("question", e.target.value)}
            className="input"
            placeholder="예) 배송 기간은 얼마나 걸리나요?"
            maxLength={300}
          />
        </div>

        <div>
          <label className="label">답변 *</label>
          <textarea
            value={form.answer}
            onChange={(e) => set("answer", e.target.value)}
            className="input min-h-[200px] font-mono leading-relaxed"
            placeholder="답변을 입력하세요. 줄바꿈은 그대로 표시됩니다."
          />
        </div>

        <div className="pt-2 border-t border-gray-100">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => set("isPublished", e.target.checked)} />
            <span className="text-sm">공개 (FAQ 페이지에 노출)</span>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div>
          {isEdit && (
            <button onClick={remove} disabled={deleting} className="btn-outline text-rose-600 border-rose-300 hover:bg-rose-50">
              {deleting ? "삭제 중..." : "삭제"}
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/admin/faq" className="btn-outline">취소</Link>
          <button onClick={save} disabled={saving} className="btn-primary min-w-[120px]">
            {saving ? "저장 중..." : (isEdit ? "수정" : "등록")}
          </button>
        </div>
      </div>
    </div>
  );
}

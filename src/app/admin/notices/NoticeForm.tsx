"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { toast } from "@/store/toast";
import { NOTICE_CATEGORIES } from "@/lib/cms";

type Notice = {
  id?: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  isPublished: boolean;
};

export default function NoticeForm({ initial }: { initial?: Notice }) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const [form, setForm] = useState<Notice>(initial || {
    title: "",
    content: "",
    category: "GENERAL",
    isPinned: false,
    isPublished: true,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const set = <K extends keyof Notice>(k: K, v: Notice[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title.trim()) { toast.warning("제목을 입력해주세요."); return; }
    if (!form.content.trim()) { toast.warning("내용을 입력해주세요."); return; }

    setSaving(true);
    try {
      const url = isEdit ? `/api/admin/notices/${initial!.id}` : "/api/admin/notices";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      toast.success(isEdit ? "수정되었습니다." : "공지가 등록되었습니다.");
      router.push("/admin/notices");
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
      const res = await fetch(`/api/admin/notices/${initial!.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "삭제 실패");
      toast.success("삭제되었습니다.");
      router.push("/admin/notices");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "삭제 실패");
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div>
          <label className="label">구분</label>
          <select value={form.category} onChange={(e) => set("category", e.target.value)} className="input max-w-[200px]">
            {NOTICE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div>
          <label className="label">제목 *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className="input"
            placeholder="공지 제목을 입력하세요"
            maxLength={200}
          />
        </div>

        <div>
          <label className="label">내용 *</label>
          <textarea
            value={form.content}
            onChange={(e) => set("content", e.target.value)}
            className="input min-h-[280px] font-mono leading-relaxed"
            placeholder="공지 내용. 줄바꿈은 그대로 표시됩니다."
          />
          <p className="text-[11px] text-gray-400 mt-1">{form.content.length} 자</p>
        </div>

        <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-100">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isPinned} onChange={(e) => set("isPinned", e.target.checked)} />
            <span className="text-sm">📌 상단 고정</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => set("isPublished", e.target.checked)} />
            <span className="text-sm">공개</span>
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
          <Link href="/admin/notices" className="btn-outline">취소</Link>
          <button onClick={save} disabled={saving} className="btn-primary min-w-[120px]">
            {saving ? "저장 중..." : (isEdit ? "수정" : "등록")}
          </button>
        </div>
      </div>
    </div>
  );
}

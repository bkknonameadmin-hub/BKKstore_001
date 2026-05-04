"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/store/toast";

type Role = "CUSTOMER" | "CS_AGENT" | "ADMIN" | "SUPER_ADMIN";
type Status = "ACTIVE" | "DORMANT" | "WITHDRAWN" | "SUSPENDED";

const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: "CUSTOMER",    label: "일반 회원",   desc: "기본 권한 — 쇼핑/주문" },
  { value: "CS_AGENT",    label: "CS 직원",     desc: "고객 응대 (주문 조회/문의 답변)" },
  { value: "ADMIN",       label: "관리자",       desc: "상품/주문/회원/콘텐츠 전체 관리" },
  { value: "SUPER_ADMIN", label: "최고관리자",   desc: "관리자 + 권한 부여 가능" },
];

const STATUSES: { value: Status; label: string; tone: string }[] = [
  { value: "ACTIVE",    label: "활성",     tone: "text-emerald-600" },
  { value: "DORMANT",   label: "휴면",     tone: "text-gray-500" },
  { value: "SUSPENDED", label: "이용정지", tone: "text-rose-600" },
  { value: "WITHDRAWN", label: "탈퇴",     tone: "text-gray-400" },
];

export default function UserRoleEditor({
  userId,
  currentRole,
  currentStatus,
}: {
  userId: string;
  currentRole: Role;
  currentStatus: Status;
}) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(currentRole);
  const [status, setStatus] = useState<Status>(currentStatus);
  const [saving, setSaving] = useState(false);

  const dirty = role !== currentRole || status !== currentStatus;

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      toast.success("권한/상태가 변경되었습니다.");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="label text-xs">권한 (Role)</label>
        <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="input text-sm">
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <p className="text-[11px] text-gray-400 mt-1">{ROLES.find((r) => r.value === role)?.desc}</p>
      </div>

      <div>
        <label className="label text-xs">계정 상태</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className="input text-sm">
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <button
        onClick={save}
        disabled={!dirty || saving}
        className="btn-primary w-full text-sm"
      >
        {saving ? "저장 중..." : dirty ? "변경 저장" : "변경 사항 없음"}
      </button>
    </div>
  );
}

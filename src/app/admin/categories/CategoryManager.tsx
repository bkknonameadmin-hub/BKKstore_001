"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Category = {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  productCount: number;
};

type Tree = (Category & { children: Tree })[];

function buildTree(items: Category[]): Tree {
  const roots = items.filter((c) => !c.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
  return roots.map((r) => ({
    ...r,
    children: items
      .filter((c) => c.parentId === r.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({ ...c, children: [] })),
  }));
}

export default function CategoryManager({ initial }: { initial: Category[] }) {
  const router = useRouter();
  const [items] = useState(initial);
  const tree = useMemo(() => buildTree(items), [items]);

  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState<{ parentId: string | null } | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
      {/* 트리 */}
      <section className="bg-white rounded border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="font-bold text-sm">카테고리 트리</h2>
          <button onClick={() => setCreating({ parentId: null })} className="btn-primary text-xs h-8">+ 상위 카테고리 추가</button>
        </div>

        {tree.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm">등록된 카테고리가 없습니다.</div>
        ) : (
          <ul className="p-2">
            {tree.map((parent) => (
              <li key={parent.id} className="mb-1">
                <Row
                  cat={parent}
                  depth={0}
                  onEdit={() => setEditing(parent)}
                  onAddChild={() => setCreating({ parentId: parent.id })}
                  onDeleted={() => router.refresh()}
                />
                {parent.children.length > 0 && (
                  <ul className="ml-6 mt-1">
                    {parent.children.map((child) => (
                      <li key={child.id} className="mb-1">
                        <Row
                          cat={child}
                          depth={1}
                          onEdit={() => setEditing(child)}
                          onAddChild={null}
                          onDeleted={() => router.refresh()}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 우측 폼 */}
      <aside>
        {creating && (
          <CategoryForm
            mode="create"
            initial={{ id: "", slug: "", name: "", parentId: creating.parentId, sortOrder: 0, productCount: 0 }}
            parents={items.filter((c) => !c.parentId)}
            onClose={() => setCreating(null)}
            onSaved={() => { setCreating(null); router.refresh(); }}
          />
        )}
        {editing && !creating && (
          <CategoryForm
            mode="edit"
            initial={editing}
            parents={items.filter((c) => !c.parentId && c.id !== editing.id)}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); router.refresh(); }}
          />
        )}
        {!creating && !editing && (
          <div className="bg-white rounded border border-gray-200 p-5 text-sm text-gray-500 leading-relaxed">
            <p className="font-bold text-gray-700 mb-2">사용 안내</p>
            <ul className="list-disc list-inside space-y-1">
              <li>왼쪽에서 [+ 상위 카테고리 추가] 또는 [+ 하위] 버튼으로 새 카테고리를 만듭니다.</li>
              <li>슬러그는 URL에 사용되며 영문/숫자/하이픈만 허용됩니다.</li>
              <li>정렬값이 작을수록 먼저 노출됩니다.</li>
              <li>상품이 등록된 카테고리는 삭제할 수 없습니다. 먼저 상품을 다른 카테고리로 이동하세요.</li>
              <li>하위 카테고리가 있는 상위 카테고리도 삭제할 수 없습니다.</li>
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

function Row({
  cat, depth, onEdit, onAddChild, onDeleted,
}: {
  cat: Category;
  depth: number;
  onEdit: () => void;
  onAddChild: (() => void) | null;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`"${cat.name}" 카테고리를 삭제하시겠습니까?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "삭제 실패");
      onDeleted();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className={`flex items-center justify-between gap-2 px-3 py-2 rounded hover:bg-gray-50 ${depth > 0 ? "border-l-2 border-gray-200 pl-4" : ""}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs text-gray-400 w-6">#{cat.sortOrder}</span>
        <div className="min-w-0">
          <div className="font-medium text-gray-800 truncate">{cat.name}</div>
          <div className="text-xs text-gray-400 font-mono truncate">/{cat.slug} · 상품 {cat.productCount}개</div>
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs flex-shrink-0">
        {onAddChild && (
          <button onClick={onAddChild} className="px-2 py-1 rounded hover:bg-gray-200 text-gray-600">+ 하위</button>
        )}
        <button onClick={onEdit} className="px-2 py-1 rounded hover:bg-gray-200 text-brand-600">수정</button>
        <button onClick={handleDelete} disabled={deleting} className="px-2 py-1 rounded hover:bg-gray-200 text-red-500">
          {deleting ? "..." : "삭제"}
        </button>
      </div>
    </div>
  );
}

function CategoryForm({
  mode, initial, parents, onClose, onSaved,
}: {
  mode: "create" | "edit";
  initial: Category;
  parents: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [parentId, setParentId] = useState<string | null>(initial.parentId);
  const [sortOrder, setSortOrder] = useState<number>(initial.sortOrder);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!name.trim()) { setErr("이름을 입력하세요."); return; }
    if (!slug.trim()) { setErr("슬러그를 입력하세요."); return; }
    if (!/^[a-z0-9-]+$/.test(slug)) { setErr("슬러그는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다."); return; }

    setLoading(true);
    try {
      const url = mode === "create" ? "/api/admin/categories" : `/api/admin/categories/${initial.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim(), parentId, sortOrder }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      onSaved();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded border border-gray-200 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm">{mode === "create" ? "카테고리 추가" : "카테고리 수정"}</h3>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
      </div>

      {err && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">{err}</div>}

      <div>
        <label className="label">이름 *</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="예) 낚싯대" />
      </div>
      <div>
        <label className="label">슬러그 *</label>
        <input
          className="input font-mono text-xs" value={slug}
          disabled={mode === "edit"}
          onChange={(e) => setSlug(e.target.value.toLowerCase())} placeholder="rod"
        />
        <p className="text-[11px] text-gray-400 mt-1">URL에 사용됩니다. 영문 소문자/숫자/하이픈만.</p>
      </div>
      <div>
        <label className="label">상위 카테고리</label>
        <select className="input" value={parentId || ""} onChange={(e) => setParentId(e.target.value || null)}>
          <option value="">(없음 — 1depth)</option>
          {parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">정렬</label>
        <input
          type="number" className="input" value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
        />
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full h-10 text-sm">
        {loading ? "저장 중..." : (mode === "create" ? "추가" : "변경 저장")}
      </button>
    </form>
  );
}

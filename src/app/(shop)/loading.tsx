export default function Loading() {
  return (
    <div className="container-mall py-12" aria-busy="true" aria-live="polite">
      <div className="flex items-center justify-center gap-3 text-gray-500 text-sm">
        <span className="inline-block w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        불러오는 중...
      </div>
    </div>
  );
}

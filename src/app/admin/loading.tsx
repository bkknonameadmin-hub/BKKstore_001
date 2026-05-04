export default function AdminLoading() {
  return (
    <div className="p-8 flex items-center justify-center text-sm text-gray-500" aria-busy="true">
      <span className="inline-block w-4 h-4 mr-2 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      불러오는 중...
    </div>
  );
}

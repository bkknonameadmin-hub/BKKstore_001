import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-mall py-20 text-center">
      <p className="text-6xl font-extrabold text-gray-300">404</p>
      <h1 className="mt-4 text-2xl font-bold">페이지를 찾을 수 없습니다</h1>
      <p className="mt-2 text-sm text-gray-500">
        요청하신 주소가 변경되었거나 더 이상 사용되지 않습니다.
      </p>
      <div className="mt-8 flex justify-center gap-2">
        <Link href="/" className="btn-primary">홈으로</Link>
        <Link href="/products" className="btn-outline">전체 상품</Link>
      </div>
    </div>
  );
}

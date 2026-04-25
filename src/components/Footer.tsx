export default function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-gray-50 text-gray-600 text-xs">
      <div className="container-mall py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <div className="text-base font-bold text-brand-700 mb-2">낚시몰</div>
          <p>고객센터: 00-000-0000 (평일 09:00 ~ 18:00)</p>
          <p>이메일: help@example.com</p>
        </div>
        <div>
          <div className="font-semibold mb-2 text-gray-800">사업자 정보</div>
          <p>상호: (주)예시상호 | 대표: 홍길동</p>
          <p>사업자등록번호: 000-00-00000</p>
          <p>통신판매업: 제0000-서울XX-0000호</p>
          <p>주소: 서울특별시 어딘가 00로 00</p>
        </div>
        <div>
          <div className="font-semibold mb-2 text-gray-800">고객 안내</div>
          <p>이용약관 · 개인정보처리방침 · 청소년보호정책</p>
          <p>배송/반품 안내 · 자주 묻는 질문</p>
          <p className="mt-3 text-gray-400">© {new Date().getFullYear()} 낚시몰. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

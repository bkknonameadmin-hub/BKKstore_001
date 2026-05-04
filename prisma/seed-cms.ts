/**
 * CMS 콘텐츠 시드 — FAQ + 공지사항 샘플
 *
 * 사용:
 *   npm run db:seed:cms
 *
 * 동작:
 *   비어있을 때만 샘플 데이터를 채운다 (이미 데이터가 있으면 skip).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FAQS = [
  { category: "DELIVERY", question: "배송 기간은 얼마나 걸리나요?", answer: "평일 14시 이전 결제 시 당일 출고되며, CJ대한통운 기준 평균 1~3일 내 도착합니다. 도서·산간 지역은 2~3일 추가됩니다." },
  { category: "DELIVERY", question: "무료배송 기준이 어떻게 되나요?", answer: "5만원 이상 주문 시 무료배송이며, 미만일 경우 3,000원의 배송비가 부과됩니다." },
  { category: "RETURN",   question: "교환·반품은 언제까지 가능한가요?", answer: "상품 수령 후 7일 이내 신청 가능합니다. 단, 사용·훼손·포장 개봉 시 반품이 불가합니다." },
  { category: "RETURN",   question: "반품 배송비는 누가 부담하나요?", answer: "단순 변심의 경우 왕복 5,000원을 고객님이 부담하시며, 상품 불량/오배송은 무료입니다." },
  { category: "PAYMENT",  question: "결제 수단에는 무엇이 있나요?", answer: "신용/체크카드, 가상계좌, 무통장입금, 네이버페이, 카카오페이를 지원합니다." },
  { category: "PAYMENT",  question: "현금영수증 발행되나요?", answer: "결제 시 체크박스로 신청하시면 자동 발행됩니다. 사후 발급은 고객센터로 문의해주세요." },
  { category: "ACCOUNT",  question: "비밀번호를 잊어버렸어요.", answer: "로그인 페이지의 '비밀번호 찾기'로 이메일 인증 후 재설정할 수 있습니다." },
  { category: "ACCOUNT",  question: "회원 탈퇴는 어디서 하나요?", answer: "마이페이지 → 보안 → 회원 탈퇴 메뉴에서 진행 가능합니다. 탈퇴 시 적립금과 쿠폰은 모두 소멸됩니다." },
  { category: "SHOPPING", question: "상품 재입고 알림을 받을 수 있나요?", answer: "현재 일부 상품에 한해 지원합니다. 상품 페이지의 알림 신청 버튼을 이용해주세요." },
  { category: "ETC",      question: "사업자 회원도 가입할 수 있나요?", answer: "네. 회원가입 후 마이페이지에서 사업자 정보를 등록하시면 세금계산서 발행이 가능합니다." },
];

const NOTICES = [
  { category: "IMPORTANT", title: "5월 가정의 달 휴무 안내", content: "5월 5일(어린이날)과 5월 15일(부처님오신날)은 배송 업무가 진행되지 않습니다. 결제는 정상 가능하며, 익일 영업일에 순차 출고됩니다.\n\n주문이 몰리는 시기이므로 여유있게 결제해 주시기 바랍니다.", isPinned: true },
  { category: "EVENT",     title: "🎁 봄 시즌 낚시용품 최대 30% 할인!", content: "전 상품 최대 30% 할인 + 5만원 이상 주문 시 사은품 증정!\n\n행사 기간: 2026.04.20 ~ 2026.05.31\n\n이 기회를 놓치지 마세요." },
  { category: "GENERAL",   title: "개인정보처리방침 개정 안내 (2026.04.01)", content: "개인정보 보관 기간 및 제3자 제공 항목이 일부 변경됩니다. 자세한 내용은 [개인정보처리방침] 페이지를 참조해주세요." },
  { category: "GENERAL",   title: "신규 결제수단 카카오페이 추가", content: "이제 카카오페이로도 결제하실 수 있습니다. 마이페이지에서 즐겨찾는 결제수단으로 등록해보세요." },
];

async function main() {
  // FAQ
  const faqCount = await prisma.faq.count();
  if (faqCount === 0) {
    console.log("[+] FAQ 샘플 10개 생성");
    await prisma.faq.createMany({
      data: FAQS.map((f, i) => ({ ...f, sortOrder: i })),
    });
  } else {
    console.log(`[=] FAQ 이미 ${faqCount}개 존재 — skip`);
  }

  // 공지사항
  const noticeCount = await prisma.notice.count();
  if (noticeCount === 0) {
    console.log("[+] 공지사항 샘플 4개 생성");
    await prisma.notice.createMany({
      data: NOTICES.map((n) => ({ ...n })),
    });
  } else {
    console.log(`[=] 공지사항 이미 ${noticeCount}개 존재 — skip`);
  }

  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

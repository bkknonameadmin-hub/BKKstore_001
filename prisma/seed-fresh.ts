/**
 * 신규 카테고리 (6개 + 하위) + 루어 중심 샘플 상품으로 새로 시드.
 *
 * ⚠ 주의: 다음 데이터를 모두 삭제합니다 (관리자 계정/쿠폰/CMS/포인트 등은 보존):
 *   - OrderItem, Order
 *   - Wishlist
 *   - Review
 *   - ProductVariant
 *   - ReturnRequest, ReturnRequestItem
 *   - RefundRequest
 *   - Product
 *   - Category
 *
 * 사용:
 *   npm run db:seed:fresh
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SubCat = { slug: string; name: string };
type MainCat = {
  slug: string;
  name: string;
  iconEmoji: string;
  description: string;
  children: SubCat[];
  productPatterns: { sub?: string; names: string[] }[];
};

const CATEGORIES: MainCat[] = [
  {
    slug: "hard-bait",
    name: "하드베이트",
    iconEmoji: "🐟",
    description: "미노우, 크랭크, 바이브, 탑워터 등 다양한 플라스틱 루어 컬렉션",
    children: [
      { slug: "minnow",    name: "미노우" },
      { slug: "crankbait", name: "크랭크베이트" },
      { slug: "vibration", name: "바이브레이션" },
      { slug: "topwater",  name: "탑워터" },
      { slug: "pencil",    name: "펜슬" },
      { slug: "popper",    name: "포퍼" },
    ],
    productPatterns: [
      { sub: "minnow",    names: ["플로팅 미노우 110mm", "싱킹 미노우 90mm", "립리스 미노우 70mm", "투웨이 미노우 130mm", "딥다이빙 미노우 100mm"] },
      { sub: "crankbait", names: ["섈로우 크랭크 5cm", "디프 크랭크 7cm", "스퀘어빌 크랭크 6cm", "라운드빌 크랭크 8cm"] },
      { sub: "vibration", names: ["메탈 바이브 14g", "사일런트 바이브 21g", "브레이드 바이브 28g", "라트 바이브 18g"] },
      { sub: "topwater",  names: ["워킹독 95mm", "프롭베이트 80mm", "와카베이트 100mm"] },
      { sub: "pencil",    names: ["페퍼 펜슬 95mm", "롱 펜슬 120mm", "트위치 펜슬 85mm"] },
      { sub: "popper",    names: ["포퍼 80mm", "스플래시 포퍼 70mm", "컵헤드 포퍼 90mm"] },
    ],
  },
  {
    slug: "soft-bait",
    name: "소프트베이트",
    iconEmoji: "🪱",
    description: "웜, 그럽, 섀드, 크리쳐, 스윔베이트까지 모든 소프트 루어",
    children: [
      { slug: "worm",       name: "웜" },
      { slug: "grub",       name: "그럽" },
      { slug: "shad",       name: "섀드" },
      { slug: "creature",   name: "크리쳐" },
      { slug: "swimbait",   name: "스윔베이트" },
    ],
    productPatterns: [
      { sub: "worm",     names: ["스트레이트 웜 3.5인치", "센코 웜 4인치", "립웜 5인치", "트릭웜 6인치", "스틱베이트 4인치"] },
      { sub: "grub",     names: ["컬리 그럽 2인치", "트윈테일 그럽 3인치", "싱글테일 그럽 4인치"] },
      { sub: "shad",     names: ["섀드 워름 4인치", "리얼 섀드 5인치", "패들 섀드 3.5인치"] },
      { sub: "creature", names: ["크리쳐 베이트 4인치", "비버 크리쳐 4.5인치", "버그 크리쳐 3인치"] },
      { sub: "swimbait", names: ["스윔베이트 5인치", "글라이드 베이트 7인치", "조인티드 스윔 6인치"] },
    ],
  },
  {
    slug: "metal-jig-spoon",
    name: "메탈지그&스푼",
    iconEmoji: "✨",
    description: "광어/우럭/송어용 메탈지그, 스푼, 인라인 스피너",
    children: [
      { slug: "metal-jig", name: "메탈지그" },
      { slug: "spoon",     name: "스푼" },
      { slug: "spinner",   name: "스피너" },
    ],
    productPatterns: [
      { sub: "metal-jig", names: ["광어 메탈지그 30g", "슬로우지깅 60g", "라이트 지깅 40g", "캐스팅 지그 28g", "고하중 지그 100g", "쇼어지깅 50g"] },
      { sub: "spoon",     names: ["송어 스푼 5g", "트라우트 스푼 7g", "캐스팅 스푼 10g", "옥수수 스푼 3g"] },
      { sub: "spinner",   names: ["인라인 스피너 5g", "윌로우블레이드 스피너 7g", "콜로라도 스피너 4g"] },
    ],
  },
  {
    slug: "skirt-bait",
    name: "스커트베이트",
    iconEmoji: "🎏",
    description: "스피너베이트, 버즈베이트, 챗터베이트, 러버지그",
    children: [
      { slug: "spinnerbait", name: "스피너베이트" },
      { slug: "buzzbait",    name: "버즈베이트" },
      { slug: "chatterbait", name: "챗터베이트" },
      { slug: "rubber-jig",  name: "러버지그" },
    ],
    productPatterns: [
      { sub: "spinnerbait", names: ["콤팩트 스피너베이트 1/4oz", "더블윌로우 1/2oz", "탠덤 스피너베이트 3/8oz"] },
      { sub: "buzzbait",    names: ["클래커 버즈베이트 3/8oz", "토드 버즈 1/2oz"] },
      { sub: "chatterbait", names: ["블레이디드 지그 1/2oz", "프리덤 챗터 3/8oz"] },
      { sub: "rubber-jig",  names: ["풋볼헤드 러버지그 1/4oz", "스윔지그 3/8oz", "피네스 지그 1/8oz"] },
    ],
  },
  {
    slug: "rig",
    name: "각종 채비",
    iconEmoji: "🪝",
    description: "훅, 봉돌, 도래/스냅, 합사라인, 와이어 리더",
    children: [
      { slug: "hook",     name: "훅" },
      { slug: "sinker",   name: "봉돌" },
      { slug: "swivel",   name: "도래/스냅" },
      { slug: "line",     name: "라인" },
      { slug: "wire",     name: "와이어/리더" },
    ],
    productPatterns: [
      { sub: "hook",   names: ["오프셋 훅 #2/0", "와이드갭 훅 #4/0", "드롭샷 훅 #1", "지그헤드 #4", "트레블 훅 #6"] },
      { sub: "sinker", names: ["텅스텐 봉돌 7g", "분리식 봉돌 14g", "스플릿샷 5g 세트", "비드 인서트 봉돌 10g"] },
      { sub: "swivel", names: ["스냅 도래 #4 10개입", "베어링 스위벨 #2", "롤링 스위벨 #6 20개입", "크로스록 스냅 #3"] },
      { sub: "line",   names: ["PE 합사 0.8호 150m", "카본 쇼크리더 20lb", "나일론 모노 4호 100m", "풀로카본 16lb 150m"] },
      { sub: "wire",   names: ["타이타늄 와이어리더 30lb", "스틸 리더 20lb 5팩", "어시스트 훅 와이어 #1/0"] },
    ],
  },
  {
    slug: "gear",
    name: "각종 장비",
    iconEmoji: "🎒",
    description: "낚싯대, 릴, 태클박스, 가방, 의류 등 출조 필수 장비",
    children: [
      { slug: "rod",       name: "낚싯대" },
      { slug: "reel",      name: "릴" },
      { slug: "tacklebox", name: "태클박스/가방" },
      { slug: "wear",      name: "낚시의류" },
      { slug: "accessory", name: "잡화" },
    ],
    productPatterns: [
      { sub: "rod",       names: ["배스로드 7ft 미디엄", "농어로드 9ft", "에깅대 8.6ft", "지깅대 6ft", "감성돔 찌낚시대 5.3m", "쇼어지깅 9.6ft"] },
      { sub: "reel",      names: ["스피닝릴 2500", "스피닝릴 4000", "베이트릴 라이트 80", "베이트릴 200HG", "전동릴 3000H"] },
      { sub: "tacklebox", names: ["4단 태클박스", "스탠드 태클백", "보냉 낚시가방 30L", "어깨 메신저백", "방수 드라이백 20L"] },
      { sub: "wear",      names: ["방수 낚시조끼", "구명조끼 자동팽창식", "방한 낚시장갑", "고어텍스 자켓 L", "낚시 부츠 280mm"] },
      { sub: "accessory", names: ["편광 선글라스", "UV차단 모자", "라인커터", "헤드랜턴 LED", "디지털 어신감지기"] },
    ],
  },
];

const BRANDS = ["오션마스터", "리버프로", "썬더캐스트", "블루웨이브", "타이드러너", "캐스트엣지", "딥워터", "프로앵글러"];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function wipe() {
  console.log("[wipe] 기존 데이터 순차 삭제 중...");
  // FK 의존: leaf → root
  await prisma.returnRequestItem.deleteMany();
  await prisma.refundRequest.deleteMany();
  await prisma.returnRequest.deleteMany();
  await prisma.review.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.orderItem.deleteMany();
  // userCoupon 의 orderId 참조 끊기 (Order 삭제 전)
  await prisma.userCoupon.updateMany({ data: { orderId: null, reservedOrderId: null } });
  // pointHistory 의 orderId 참조 끊기
  await prisma.pointHistory.updateMany({ data: { orderId: null } });
  await prisma.order.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  console.log("[wipe] 완료");
}

async function seedCategories() {
  console.log("[cat] 6개 메인 + 하위 카테고리 생성 중...");
  const map: Record<string, string> = {}; // slug → id

  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    const parent = await prisma.category.create({
      data: {
        slug: c.slug,
        name: c.name,
        sortOrder: i,
        iconEmoji: c.iconEmoji,
        description: c.description,
      },
    });
    map[c.slug] = parent.id;

    for (let j = 0; j < c.children.length; j++) {
      const ch = c.children[j];
      const child = await prisma.category.create({
        data: {
          slug: ch.slug,
          name: ch.name,
          parentId: parent.id,
          sortOrder: j,
        },
      });
      map[ch.slug] = child.id;
    }
  }

  console.log(`[cat] 카테고리 ${Object.keys(map).length}개 생성 완료`);
  return map;
}

async function seedProducts(catMap: Record<string, string>) {
  console.log("[product] 샘플 상품 생성 중...");
  let counter = 0;

  for (const main of CATEGORIES) {
    for (const pattern of main.productPatterns) {
      const subSlug = pattern.sub || main.slug;
      const targetCatId = catMap[subSlug];
      if (!targetCatId) continue;

      for (const baseName of pattern.names) {
        // 같은 베이스 이름으로 색상/사양 다양화 5~8개씩
        const variations = randInt(4, 8);
        for (let v = 0; v < variations; v++) {
          counter++;
          const brand = rand(BRANDS);
          const colorVariants = ["내추럴", "차트", "블루", "골드", "퍼플", "파이어타이거", "고스트", "클리어"];
          const color = rand(colorVariants);
          const name = `${baseName} (${color})`;
          const price = randInt(3, 200) * 1000;
          const hasSale = Math.random() < 0.35;
          const stock = Math.random() < 0.05 ? 0 : randInt(5, 200);

          await prisma.product.create({
            data: {
              sku: `SKU-${counter.toString().padStart(5, "0")}`,
              name,
              brand,
              description: `${brand} ${baseName} - 실전 검증된 ${main.name} 라인업입니다. ${color} 컬러로 다양한 필드 컨디션에 대응합니다.`,
              price,
              salePrice: hasSale ? Math.floor(price * randInt(70, 92) / 100 / 100) * 100 : null,
              stock,
              thumbnail: `/images/placeholder.svg`,
              images: [`/images/placeholder.svg`],
              isActive: true,
              isFeatured: Math.random() < 0.12,
              categoryId: targetCatId,
            },
          });
        }
      }
    }
  }

  console.log(`[product] ${counter}개 상품 생성 완료`);
}

async function main() {
  await wipe();
  const catMap = await seedCategories();
  await seedProducts(catMap);
  console.log("\n✅ Done. 새 카테고리 + 상품 시드 완료.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

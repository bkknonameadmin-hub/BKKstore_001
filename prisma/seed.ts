import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  { slug: "rod", name: "낚싯대", children: [
    { slug: "rod-sea", name: "바다루어대" },
    { slug: "rod-fresh", name: "민물대" },
    { slug: "rod-jigging", name: "지깅대" },
  ]},
  { slug: "reel", name: "릴", children: [
    { slug: "reel-spinning", name: "스피닝릴" },
    { slug: "reel-baitcast", name: "베이트릴" },
  ]},
  { slug: "line", name: "라인/원줄" },
  { slug: "lure", name: "루어/미끼" },
  { slug: "tackle", name: "소품/채비" },
  { slug: "wear", name: "낚시의류" },
  { slug: "bag", name: "가방/박스" },
];

const sampleNames = [
  "초경량 카본 루어대", "원피스 농어대", "감성돔 전용 찌낚시대",
  "지깅 전용 카본대", "베이트 캐스팅 로드", "민물 붕어대 3.6m",
  "스피닝 릴 2500", "스피닝 릴 4000", "베이트릴 라이트", "프리미엄 BG 릴",
  "PE 합사 0.8호 150m", "카본 쇼크리더 20lb", "나일론 모노 라인 4호",
  "바이브레이션 루어 14g", "메탈지그 40g", "미노우 110mm",
  "웜 4인치 5종", "다운샷 봉돌 세트", "쇼크리더 매듭기",
  "방수 낚시조끼", "구명조끼 자동팽창식", "낚시 모자 UV차단",
  "방한 낚시장갑", "태클박스 4단", "보냉 낚시가방 30L",
  "원피스 캐스팅대", "광어 다운샷 전용대", "에깅 전용대 8.6ft",
];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function main() {
  console.log("Seeding categories...");
  const catMap: Record<string, string> = {};

  for (const c of categories) {
    const parent = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name },
      create: { slug: c.slug, name: c.name },
    });
    catMap[c.slug] = parent.id;

    if (c.children) {
      for (const ch of c.children) {
        const child = await prisma.category.upsert({
          where: { slug: ch.slug },
          update: { name: ch.name, parentId: parent.id },
          create: { slug: ch.slug, name: ch.name, parentId: parent.id },
        });
        catMap[ch.slug] = child.id;
      }
    }
  }

  console.log("Seeding products...");
  const allCatSlugs = Object.keys(catMap);
  const brands = ["오션마스터", "리버프로", "썬더캐스트", "블루웨이브", "타이드러너", "캐스트엣지"];

  for (let i = 0; i < 300; i++) {
    const slug = rand(allCatSlugs);
    const name = `${rand(sampleNames)} #${i + 1}`;
    const price = randInt(8, 500) * 1000;
    const hasSale = Math.random() < 0.4;

    await prisma.product.upsert({
      where: { sku: `SKU-${(i + 1).toString().padStart(5, "0")}` },
      update: {},
      create: {
        sku: `SKU-${(i + 1).toString().padStart(5, "0")}`,
        name,
        brand: rand(brands),
        description: `${name} - 고품질 소재로 제작된 낚시 용품입니다. 내구성과 사용성을 모두 갖췄습니다.`,
        price,
        salePrice: hasSale ? Math.floor(price * randInt(70, 95) / 100 / 100) * 100 : null,
        stock: randInt(0, 200),
        thumbnail: `/images/placeholder.svg`,
        images: [`/images/placeholder.svg`],
        isActive: true,
        isFeatured: Math.random() < 0.1,
        categoryId: catMap[slug],
      },
    });
  }

  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

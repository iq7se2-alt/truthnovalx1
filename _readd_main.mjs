// Re-add wrongly deleted main characters + their images + appearances

import { PrismaClient } from '@prisma/client';
import { readdirSync } from 'fs';

process.env.DATABASE_URL = 'file:/home/z/my-project/db/custom.db';
const db = new PrismaClient();

function normalizeArabic(name) {
  return name.replace(/[\u064B-\u0652]/g, '').replace(/[إأآا]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim().toLowerCase();
}

// Characters that were wrongly deleted (from previous DB + Discord images)
const MISSING_CHARS = [
  { name: 'آرو', isMain: true, imageKeywords: ['Aro', 'آرو', 'Aru'] },
  { name: 'جابا', isMain: true, imageKeywords: ['Jaba', 'جابا', 'Gaba'] },
  { name: 'ساكار', isMain: true, imageKeywords: ['Sakar', 'ساكار'] },
  { name: 'مورجانا', isMain: false, imageKeywords: ['Morgana', 'مورجانا'] },
  { name: 'المستبصر', isMain: false, imageKeywords: ['المستبصر', 'Seer', 'Clairvoyant'] },
  { name: 'دارفيون', isMain: false, imageKeywords: ['Darvion', 'دارفيون'] },
  { name: 'مارليك', isMain: false, imageKeywords: ['Marlick', 'مارليك', 'Butcher'] },
  { name: 'تانويا', isMain: false, imageKeywords: ['Tanuya', 'تانويا'] },
  { name: 'انتيراس', isMain: false, imageKeywords: ['Interas', 'انتيراس'] },
  { name: 'دريك', isMain: false, imageKeywords: ['Drake', 'دريك'] },
  { name: 'ليوسار', isMain: false, imageKeywords: ['Leosar', 'ليوسار'] },
  { name: 'براي', isMain: false, imageKeywords: ['Bray', 'براي'] },
  { name: 'رايدين', isMain: false, imageKeywords: ['Raiden', 'رايدين'] },
  { name: 'زارغول', isMain: false, imageKeywords: ['Zarghul', 'زارغول'] },
  { name: 'أوميس', isMain: false, imageKeywords: ['Omis', 'أوميس'] },
  { name: 'أوميرا', isMain: false, imageKeywords: ['Omeira', 'أوميرا'] },
  { name: 'جلاثيون', isMain: false, imageKeywords: ['Glatheon', 'جلاثيون'] },
  { name: 'نانسي', isMain: false, imageKeywords: ['Nancy', 'نانسي'] },
  { name: 'سيفار', isMain: false, imageKeywords: ['Sevar', 'سيفار'] },
  { name: 'زافاروس', isMain: false, imageKeywords: ['Zafarus', 'زافاروس', 'Zafarus'] },
  { name: 'مارليك', isMain: false, imageKeywords: ['Marlick', 'مارليك'] },
  { name: 'أركالون', isMain: false, imageKeywords: ['Arkalon', 'أركالون'] },
  { name: 'سيليبوس', isMain: false, imageKeywords: ['Selibus', 'سيليبوس', 'Selibos'] },
  { name: 'دورغر', isMain: false, imageKeywords: ['Durghar', 'دورغر', 'Dorghar'] },
  { name: 'دراكو', isMain: false, imageKeywords: ['Draco', 'دراكو'] },
  { name: 'أورزون', isMain: false, imageKeywords: ['Orzon', 'أورزون'] },
  { name: 'جالان برادلي', isMain: false, imageKeywords: ['Galan_Bradley', 'جالان'] },
  { name: 'الأمير ألفريد', isMain: false, imageKeywords: ['Prince_Alfred', 'ألفريد'] },
  { name: 'بيلي بورتون', isMain: false, imageKeywords: ['Billy_Burton', 'بيلي'] },
  { name: 'ثيو', isMain: false, imageKeywords: ['Theo', 'ثيو'] },
  { name: 'بيون كامدن', isMain: false, imageKeywords: ['Peon_Camden', 'بيون'] },
  { name: 'هولاك', isMain: false, imageKeywords: ['Holak', 'هولاك'] },
  { name: 'ويد', isMain: false, imageKeywords: ['Wade', 'ويد'] },
  { name: 'شداد', isMain: false, imageKeywords: ['Shaddad', 'شداد'] },
  { name: 'باروك', isMain: false, imageKeywords: ['Baruk', 'باروك'] },
  { name: 'ساهر', isMain: false, imageKeywords: ['Saher', 'ساهر'] },
];

// Get all image files
const imageFiles = readdirSync('public/images/characters').filter(f =>
  /\.(jpg|jpeg|png|webp|gif)$/i.test(f)
);

console.log(`=== Re-adding ${MISSING_CHARS.length} missing characters ===`);

let added = 0;
for (const mc of MISSING_CHARS) {
  // Check if already exists
  const existing = await db.character.findFirst({ where: { name: mc.name } });
  if (existing) {
    console.log(`  Already exists: ${mc.name}`);
    continue;
  }

  // Find matching image
  let imageUrl = null;
  for (const keyword of mc.imageKeywords) {
    const match = imageFiles.find(f =>
      f.toLowerCase().includes(keyword.toLowerCase()) ||
      f.includes(keyword)
    );
    if (match) {
      imageUrl = `/images/characters/${match}`;
      break;
    }
  }

  // Create character
  try {
    const char = await db.character.create({
      data: {
        name: mc.name,
        nameEn: null,
        imageUrl,
        description: '',
        isMain: mc.isMain,
        color: null,
      },
    });
    added++;
    console.log(`  ✅ ${mc.name} ${mc.isMain ? '(MAIN)' : ''} ${imageUrl ? '→ ' + imageUrl : '(no image)'}`);

    // Build appearances: find chapters that mention this name
    const chapters = await db.chapter.findMany({
      where: { content: { contains: mc.name } },
      select: { id: true, number: true },
      take: 200,
    });
    for (const ch of chapters) {
      try {
        await db.chapterCharacter.create({
          data: { chapterId: ch.id, characterId: char.id, paragraphIndex: 0, wordIndex: 0 }
        });
      } catch (e) {
        // duplicate
      }
    }
    console.log(`     → ${chapters.length} chapters`);
  } catch (e) {
    console.error(`  ❌ ${mc.name}: ${e.message}`);
  }
}

console.log(`\nAdded: ${added}`);

// Final stats
const finalCount = await db.character.count();
const finalMain = await db.character.count({ where: { isMain: true } });
const finalWithImg = await db.character.count({ where: { NOT: { OR: [{ imageUrl: null }, { imageUrl: '' }] } } });
const finalApps = await db.chapterCharacter.count();
console.log(`\n=== FINAL ===`);
console.log(`Total characters: ${finalCount}`);
console.log(`Main characters: ${finalMain}`);
console.log(`With images: ${finalWithImg}`);
console.log(`Total appearances: ${finalApps}`);

await db.$disconnect();
console.log('Done!');

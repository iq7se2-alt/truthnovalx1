// Re-add important characters that were wrongly deleted
// Characters with isMain=true or that have Discord images should never be deleted

import ZAI from 'z-ai-web-dev-sdk';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';

process.env.DATABASE_URL = 'file:/home/z/my-project/db/custom.db';
const db = new PrismaClient();

console.log('=== Re-adding wrongly deleted characters ===');

// Load Discord image data (these are definitely characters — they have fan art)
const discordData = JSON.parse(readFileSync('characters_images.json', 'utf-8'));
console.log(`Discord images: ${discordData.length}`);

// Get current characters
const currentChars = await db.character.findMany({ select: { id: true, name: true, imageUrl: true } });
const currentNames = new Set(currentChars.map(c => normalizeArabic(c.name)));
console.log(`Current characters in DB: ${currentChars.length}`);

function normalizeArabic(name) {
  return name.replace(/[\u064B-\u0652]/g, '').replace(/[إأآا]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim().toLowerCase();
}

function extractArabicName(content) {
  if (!content) return null;
  const arabicMatches = content.match(/[\u0600-\u06FF][\u0600-\u06FF\s]+/g);
  if (arabicMatches && arabicMatches.length > 0) {
    return arabicMatches.sort((a, b) => b.trim().length - a.trim().length)[0].trim();
  }
  const englishMatch = content.match(/[A-Za-z][A-Za-z\s]+/);
  return englishMatch ? englishMatch[0].trim() : content.trim();
}

function extractEnglishName(content) {
  if (!content) return null;
  const m = content.match(/[A-Za-z][A-Za-z\s,.'-]+/);
  return m ? m[0].trim().substring(0, 100) : null;
}

// Re-add characters from Discord images that were deleted
let reAdded = 0;
for (const img of discordData) {
  const arabicName = extractArabicName(img.characterName);
  const englishName = extractEnglishName(img.characterName);
  if (!arabicName || normalizeArabic(arabicName).length < 2) continue;

  // Check if this character still exists
  const normName = normalizeArabic(arabicName);
  const exists = currentChars.some(c => normalizeArabic(c.name) === normName);
  if (exists) continue;

  // Re-create the character
  try {
    const newChar = await db.character.create({
      data: {
        name: arabicName.substring(0, 100),
        nameEn: englishName,
        imageUrl: img.localPath,
        description: '',
        isMain: false,
        color: null,
      },
    });
    currentChars.push(newChar);
    currentNames.add(normName);
    reAdded++;
    console.log(`  ✅ Re-added: ${arabicName} → ${img.localPath}`);
  } catch (e) {
    // duplicate — skip
  }
}

console.log(`\nRe-added ${reAdded} characters from Discord images`);

// Now re-extract appearances for all characters (including re-added ones)
console.log('\n=== Rebuilding appearances for all characters ===');
const allChars = await db.character.findMany({ select: { id: true, name: true } });
console.log(`Total characters: ${allChars.length}`);

// Clear existing appearances
await db.chapterCharacter.deleteMany({});
console.log('Cleared old appearances');

let totalApps = 0;
let charsWithApps = 0;
for (const char of allChars) {
  if (char.name.length < 3) continue;
  
  // Find chapters that mention this character
  const chapters = await db.chapter.findMany({
    where: { content: { contains: char.name } },
    select: { id: true, number: true },
    take: 200,
  });
  
  if (chapters.length > 0) {
    for (const ch of chapters) {
      try {
        await db.chapterCharacter.create({
          data: { chapterId: ch.id, characterId: char.id, paragraphIndex: 0, wordIndex: 0 }
        });
        totalApps++;
      } catch (e) {
        // duplicate — skip
      }
    }
    charsWithApps++;
  }
}

console.log(`Characters with appearances: ${charsWithApps}`);
console.log(`Total appearances: ${totalApps}`);

// Final stats
const finalCount = await db.character.count();
const finalWithImg = await db.character.count({ where: { NOT: { OR: [{ imageUrl: null }, { imageUrl: '' }] } } });
console.log(`\n=== FINAL ===`);
console.log(`Total characters: ${finalCount}`);
console.log(`With images: ${finalWithImg}`);
console.log(`Without images: ${finalCount - finalWithImg}`);

await db.$disconnect();
console.log('Done!');

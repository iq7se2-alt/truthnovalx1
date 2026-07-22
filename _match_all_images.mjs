// Match Discord images to all characters (existing + newly extracted)
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';

process.env.DATABASE_URL = 'file:/home/z/my-project/db/custom.db';
const db = new PrismaClient();

const discordData = JSON.parse(readFileSync('characters_images.json', 'utf-8'));

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

function normalizeArabic(name) {
  if (!name) return '';
  return name.replace(/[\u064B-\u0652]/g, '').replace(/[إأآا]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim().toLowerCase();
}

function fuzzyMatch(discordName, dbName) {
  const d = normalizeArabic(discordName);
  const b = normalizeArabic(dbName);
  if (!d || !b) return false;
  if (d === b) return true;
  if (d.includes(b) || b.includes(d)) return true;
  // Check if the core name (without "ال" prefix) matches
  const dCore = d.replace(/^ال/, '');
  const bCore = b.replace(/^ال/, '');
  if (dCore === bCore && dCore.length > 2) return true;
  return false;
}

// Load all characters
const allChars = await db.character.findMany({ select: { id: true, name: true, nameEn: true, imageUrl: true } });
console.log(`Total characters: ${allChars.length}`);
console.log(`Characters without images: ${allChars.filter(c => !c.imageUrl).length}`);

let updated = 0;
for (const img of discordData) {
  const arabicName = extractArabicName(img.characterName);
  const englishName = extractEnglishName(img.characterName);
  if (!arabicName) continue;

  // Find best match
  let bestMatch = null;
  for (const char of allChars) {
    if (fuzzyMatch(arabicName, char.name)) {
      bestMatch = char;
      break;
    }
  }

  if (bestMatch && !bestMatch.imageUrl) {
    await db.character.update({
      where: { id: bestMatch.id },
      data: { imageUrl: img.localPath, nameEn: englishName || bestMatch.nameEn },
    });
    bestMatch.imageUrl = img.localPath;
    updated++;
  }
}

console.log(`Updated ${updated} characters with images`);

// Final stats
const total = await db.character.count();
const withImg = await db.character.count({ where: { NOT: { OR: [{ imageUrl: null }, { imageUrl: '' }] } } });
const noImg = await db.character.count({ where: { OR: [{ imageUrl: null }, { imageUrl: '' }] } });
const rels = await db.characterRelation.count();
const apps = await db.chapterCharacter.count();
console.log(`\n=== FINAL STATS ===`);
console.log(`Characters: ${total}`);
console.log(`With images: ${withImg}`);
console.log(`Without images: ${noImg}`);
console.log(`Relations: ${rels}`);
console.log(`Appearances: ${apps}`);

await db.$disconnect();

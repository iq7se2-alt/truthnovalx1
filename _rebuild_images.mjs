// Rebuild characters_images.json from existing image files + match to DB characters

import { PrismaClient } from '@prisma/client';
import { readdirSync, writeFileSync } from 'fs';

process.env.DATABASE_URL = 'file:/home/z/my-project/db/custom.db';
const db = new PrismaClient();

function normalizeArabic(name) {
  return name.replace(/[\u064B-\u0652]/g, '').replace(/[إأآا]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim().toLowerCase();
}

function extractArabicName(filename) {
  // Remove extension
  let name = filename.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '');
  // Remove trailing _NUMBER (e.g., _123)
  name = name.replace(/_\d+$/, '');
  // Try to find Arabic text
  const arabicMatches = name.match(/[\u0600-\u06FF][\u0600-\u06FF\s]+/g);
  if (arabicMatches && arabicMatches.length > 0) {
    return arabicMatches.sort((a, b) => b.trim().length - a.trim().length)[0].trim();
  }
  // Fallback: use English name
  const englishMatch = name.match(/[A-Za-z][A-Za-z\s]+/);
  return englishMatch ? englishMatch[0].trim() : name;
}

console.log('=== Rebuild image mappings from files ===');

const imageFiles = readdirSync('public/images/characters').filter(f =>
  /\.(jpg|jpeg|png|webp|gif)$/i.test(f)
);
console.log(`Image files: ${imageFiles.length}`);

// Build image data
const imageData = imageFiles.map((file, idx) => ({
  characterName: extractArabicName(file),
  localPath: `/images/characters/${file}`,
}));

// Save to JSON for reference
writeFileSync('characters_images.json', JSON.stringify(imageData, null, 2));
console.log(`Saved ${imageData.length} entries to characters_images.json`);

// Load all DB characters
const allChars = await db.character.findMany({ select: { id: true, name: true, nameEn: true, imageUrl: true } });
console.log(`DB characters: ${allChars.length}`);

// Match images to characters
let matched = 0;
let updated = 0;

for (const img of imageData) {
  if (!img.characterName) continue;

  // Try to find a matching character
  let bestMatch = null;
  for (const char of allChars) {
    if (normalizeArabic(img.characterName) === normalizeArabic(char.name)) {
      bestMatch = char;
      break;
    }
    // Partial match
    if (normalizeArabic(char.name).length > 3 &&
        (normalizeArabic(img.characterName).includes(normalizeArabic(char.name)) ||
         normalizeArabic(char.name).includes(normalizeArabic(img.characterName)))) {
      bestMatch = char;
      break;
    }
  }

  if (bestMatch && !bestMatch.imageUrl) {
    await db.character.update({
      where: { id: bestMatch.id },
      data: { imageUrl: img.localPath },
    });
    bestMatch.imageUrl = img.localPath; // update in-memory
    updated++;
  }
  if (bestMatch) matched++;
}

console.log(`\nMatched: ${matched}, Updated (added image): ${updated}`);

// Final stats
const finalCount = await db.character.count();
const finalWithImg = await db.character.count({ where: { NOT: { OR: [{ imageUrl: null }, { imageUrl: '' }] } } });
console.log(`\n=== FINAL ===`);
console.log(`Total characters: ${finalCount}`);
console.log(`With images: ${finalWithImg}`);
console.log(`Without images: ${finalCount - finalWithImg}`);

await db.$disconnect();
console.log('Done!');

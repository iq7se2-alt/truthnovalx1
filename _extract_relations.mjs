// Extract character relations from chapter content
// Looks for patterns like "والد X", "ابن Y", "صديق Z", etc.

import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL = 'file:/home/z/my-project/db/custom.db';
const db = new PrismaClient();

function normalizeArabic(name) {
  return name.replace(/[\u064B-\u0652]/g, '').replace(/[إأآا]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim().toLowerCase();
}

console.log('=== Character Relation Extraction ===');

// Load all characters
const chars = await db.character.findMany({ select: { id: true, name: true } });
const charByNormName = new Map();
for (const c of chars) {
  charByNormName.set(normalizeArabic(c.name), c);
}
console.log(`Loaded ${chars.length} characters`);

// Relation patterns: (Name1) [relation word] (Name2)
// e.g., "روبين والد قيصر" → from=روبين, to=قيصر, type=أب
const RELATION_PATTERNS = [
  // Father patterns
  { regex: /([\u0600-\u06FF]{2,25})\s+والد\s+([\u0600-\u06FF]{2,25})/g, type: 'أب', fromFirst: true },
  { regex: /([\u0600-\u06FF]{2,25})\s+أب\s+([\u0600-\u06FF]{2,25})/g, type: 'أب', fromFirst: true },
  { regex: /والد\s+([\u0600-\u06FF]{2,25})\s+([\u0600-\u06FF]{2,25})/g, type: 'أب', fromFirst: false, fromIdx: 2, toIdx: 1 },
  // Mother patterns
  { regex: /([\u0600-\u06FF]{2,25})\s+والدة\s+([\u0600-\u06FF]{2,25})/g, type: 'أم', fromFirst: true },
  { regex: /([\u0600-\u06FF]{2,25})\s+أم\s+([\u0600-\u06FF]{2,25})/g, type: 'أم', fromFirst: true },
  // Son patterns
  { regex: /([\u0600-\u06FF]{2,25})\s+ابن\s+([\u0600-\u06FF]{2,25})/g, type: 'ابن', fromFirst: true },
  { regex: /([\u0600-\u06FF]{2,25})\s+ولد\s+([\u0600-\u06FF]{2,25})/g, type: 'ابن', fromFirst: true },
  // Daughter patterns
  { regex: /([\u0600-\u06FF]{2,25})\s+ابنة\s+([\u0600-\u06FF]{2,25})/g, type: 'ابنة', fromFirst: true },
  { regex: /([\u0600-\u06FF]{2,25})\s+بنت\s+([\u0600-\u06FF]{2,25})/g, type: 'ابنة', fromFirst: true },
  // Brother patterns
  { regex: /([\u0600-\u06FF]{2,25})\s+أخ\s+([\u0600-\u06FF]{2,25})/g, type: 'أخ', fromFirst: true },
  // Sister patterns
  { regex: /([\u0600-\u06FF]{2,25})\s+أخت\s+([\u0600-\u06FF]{2,25})/g, type: 'أخت', fromFirst: true },
  // Friend patterns
  { regex: /([\u0600-\u06FF]{2,25})\s+صديق\s+([\u0600-\u06FF]{2,25})/g, type: 'صديق', fromFirst: true },
  // Enemy patterns
  { regex: /([\u0600-\u06FF]{2,25})\s+عدو\s+([\u0600-\u06FF]{2,25})/g, type: 'عدو', fromFirst: true },
  // Teacher patterns
  { regex: /([\u0600-\u06FF]{2,25})\s+معلم\s+([\u0600-\u06FF]{2,25})/g, type: 'معلم', fromFirst: true },
  { regex: /([\u0600-\u06FF]{2,25})\s+تلميذ\s+([\u0600-\u06FF]{2,25})/g, type: 'تلميذ', fromFirst: true },
  // Master/servant
  { regex: /([\u0600-\u06FF]{2,25})\s+سيده\s+([\u0600-\u06FF]{2,25})/g, type: 'سيده', fromFirst: false },
  { regex: /([\u0600-\u06FF]{2,25})\s+تابع\s+([\u0600-\u06FF]{2,25})/g, type: 'تابع', fromFirst: true },
  // Husband/wife
  { regex: /([\u0600-\u06FF]{2,25})\s+زوج\s+([\u0600-\u06FF]{2,25})/g, type: 'زوج', fromFirst: true },
  { regex: /([\u0600-\u06FF]{2,25})\s+زوجة\s+([\u0600-\u06FF]{2,25})/g, type: 'زوجة', fromFirst: true },
  // Family
  { regex: /([\u0600-\u06FF]{2,25})\s+عائلة\s+([\u0600-\u06FF]{2,25})/g, type: 'عائلة', fromFirst: true },
  // Ally
  { regex: /([\u0600-\u06FF]{2,25})\s+حليف\s+([\u0600-\u06FF]{2,25})/g, type: 'حليف', fromFirst: true },
];

// Load existing relations to avoid duplicates
const existingRels = await db.characterRelation.findMany({ select: { fromId: true, toId: true, type: true } });
const existingRelKeys = new Set();
for (const r of existingRels) {
  existingRelKeys.add(`${r.fromId}-${r.toId}-${r.type}`);
}
console.log(`Existing relations: ${existingRels.length}`);

// Load chapters (sample for speed — first 500 chapters)
const chapters = await db.chapter.findMany({
  select: { content: true },
  orderBy: { number: 'asc' },
  take: 2500, // Process first 500 chapters for speed
});
console.log(`Processing ${chapters.length} chapters for relations...`);

const newRelations = [];
const seenInThisRun = new Set();

for (const ch of chapters) {
  const content = ch.content || '';
  
  for (const pattern of RELATION_PATTERNS) {
    const re = new RegExp(pattern.regex.source, 'g');
    let match;
    while ((match = re.exec(content)) !== null) {
      let name1, name2;
      if (pattern.fromFirst) {
        name1 = match[1].trim();
        name2 = match[2].trim();
      } else {
        name1 = match[pattern.fromIdx || 1].trim();
        name2 = match[pattern.toIdx || 2].trim();
      }
      
      const char1 = charByNormName.get(normalizeArabic(name1));
      const char2 = charByNormName.get(normalizeArabic(name2));
      
      if (char1 && char2 && char1.id !== char2.id) {
        const key = `${char1.id}-${char2.id}-${pattern.type}`;
        if (!existingRelKeys.has(key) && !seenInThisRun.has(key)) {
          seenInThisRun.add(key);
          newRelations.push({
            fromId: char1.id,
            toId: char2.id,
            type: pattern.type,
            description: '',
          });
        }
      }
    }
  }
}

console.log(`Found ${newRelations.length} new relations`);

// Create relations
let created = 0;
for (const rel of newRelations) {
  try {
    await db.characterRelation.create({ data: rel });
    created++;
  } catch (e) {
    // duplicate — skip
  }
}

console.log(`Created ${created} new relations`);

const totalRels = await db.characterRelation.count();
console.log(`\n=== FINAL ===`);
console.log(`Total relations: ${totalRels}`);

await db.$disconnect();

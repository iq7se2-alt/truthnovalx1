// Comprehensive character extraction from ALL chapters
// Extracts every proper noun/name from the story content
// Creates characters even without images, links to chapters

import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL = 'file:/home/z/my-project/db/custom.db';
const db = new PrismaClient();

// Arabic stopwords + common words that are NOT character names
const STOPWORDS = new Set([
  // Pronouns
  'هو', 'هي', 'هم', 'هن', 'أنا', 'نحن', 'أنت', 'أنتم', 'أنتم', 'هذا', 'هذه', 'ذلك', 'تلك', 'الذي', 'التي', 'الذين', 'اللاتي', 'اللواتي',
  // Prepositions
  'في', 'من', 'إلى', 'على', 'عن', 'مع', 'بعد', 'قبل', 'خلف', 'أمام', 'فوق', 'تحت', 'حول', 'بين', 'عند', 'لدي', 'إلى',
  // Conjunctions
  'و', 'أو', 'ثم', 'لكن', 'إلا', 'بل', 'حتى', 'كي', 'لأن', 'إذا', 'إذ', 'حيث', 'كما', 'أن', 'إن', 'لكي',
  // Articles
  'ال', 'الذي', 'التي', 'الذين',
  // Common verbs
  'قال', 'قالت', 'يقول', 'تقول', 'أجاب', 'أجابت', 'صاح', 'صاحت', 'همس', 'همست', 'فكر', 'فكرت', 'رأى', 'رأت', 'نظر', 'نظرت', 'سمع', 'سمعت', 'شعر', 'شعرت', 'عرف', 'عرفت', 'فهم', 'فهمت', 'أراد', 'أرادت', 'ذهب', 'ذهبت', 'جاء', 'جاءت', 'دخل', 'دخلت', 'خرج', 'خرجت', 'وقف', 'وقفت', 'جلس', 'جلست', 'مشى', 'مشعت', 'ركض', 'ركضت', 'ضحك', 'ضحكت', 'بكى', 'بكت', 'صرخ', 'صرخت', 'قتل', 'قتلت', 'مات', 'ماتت', 'ولد', 'ولدت', 'عاش', 'عاشت',
  // Common nouns (not names)
  'رجل', 'امرأة', 'شاب', 'فتاة', 'طفل', 'طفلة', 'شيخ', 'عجوز', 'مدينة', 'قصر', 'بيت', 'غرفة', 'باب', 'نافذة', 'طريق', 'شارع', 'سوق', 'مدرسة', 'جامعة', 'مكتب', 'كرسي', 'طاولة', 'سرير', 'كتاب', 'قلم', 'ورقة', 'سيف', 'درع', 'قوس', 'سهم', 'حصان', 'كلب', 'قط', 'طائر', 'سمكة', 'شجرة', 'زهرة', 'عشب', 'ماء', 'نار', 'هواء', 'تراب', 'حجر', 'ذهب', 'فضة', 'نقود', 'طعام', 'خبز', 'لحم', 'ماء', 'عصير', 'لبن', 'شاي', 'قهوة',
  // Time words
  'يوم', 'ليلة', 'صباح', 'مساء', 'ظهر', 'عصر', 'فجر', 'مغرب', 'عشاء', 'ساعة', 'دقيقة', 'ثانية', 'أسبوع', 'شهر', 'سنة', 'عام', 'زمن', 'وقت', 'آن', 'الآن', 'أمس', 'غدا', 'اليوم', 'أمس', 'بعد', 'قبل',
  // Numbers
  'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'مئة', 'ألف', 'مليون',
  // Adjectives (common)
  'كبير', 'صغير', 'طويل', 'قصير', 'عريض', 'ضيق', 'ثقيل', 'خفيف', 'سريع', 'بطيء', 'جميل', 'قبيح', 'جديد', 'قديم', 'حار', 'بارد', 'حلو', 'مر', 'أحمر', 'أزرق', 'أخضر', 'أصفر', 'أسود', 'أبيض', 'ذهبي', 'فضي', 'قوي', 'ضعيف', 'ذكي', 'غبي', 'طيب', 'شرير', 'شجاع', 'جبان', 'صادق', 'كاذب', 'غني', 'فقير',
  // Question words
  'ما', 'ماذا', 'كيف', 'متى', 'أين', 'لماذا', 'هل', 'كم', 'أي', 'من',
  // Negation
  'لا', 'لم', 'لن', 'ليس', 'ليست', 'غير', 'ما', 'إلا',
  // Other common
  'شيء', 'شيئا', 'كل', 'بعض', 'كثير', 'قليل', 'جميع', 'نفس', 'غير', 'مثل', 'أي', 'هنا', 'هناك', 'كذلك', 'أيضا', 'فقط', 'حتى', 'إلا', 'بل', 'لكن', 'قد', 'كان', 'كانت', 'يكون', 'تكون', 'صار', 'صارت', 'أصبح', 'أصبحت', 'بقي', 'بقيت', 'ظل', 'ظلت',
  // Titles (not names themselves, but often precede names)
  'السيد', 'السيدة', 'الشيخ', 'الأمير', 'الأميرة', 'الملك', 'الملكة', 'الدوق', 'الدوقة', 'البارون', 'اللورد', 'المارشال', 'القائد', 'الجنرال', 'الكابتن', 'الحارس', 'الجندي', 'الوزير', 'المستشار', 'الكاهن', 'القسيس', 'الراهب', 'الساحر', 'المعلم', 'التلميذ', 'الابن', 'الابنة', 'الأب', 'الأم', 'الأخ', 'الأخت', 'العم', 'العمة', 'الخال', 'الخالة', 'الجد', 'الجدة', 'الحفيد', 'الحفيدة', 'الزوج', 'الزوجة', 'الصديق', 'العدو', 'الحليف', 'التابع',
]);

// Titles that often precede character names
const TITLES = ['السيد', 'السيدة', 'الشيخ', 'الأمير', 'الأميرة', 'الملك', 'الملكة', 'الدوق', 'الدوقة', 'البارون', 'اللورد', 'المارشال', 'القائد', 'الجنرال', 'الكابتن', 'الوزير', 'المستشار', 'الكاهن', 'القسيس', 'الراهب', 'الساحر', 'المعلم', 'العم', 'الخال', 'الجد', 'السيد', 'العبقري', 'القديس', 'البطريرك', 'الإمبراطور', 'الإمبراطورة', 'السلطان', 'الخاقان', 'القيصر', 'الفرعون'];

// Patterns that indicate a name follows
const NAME_PATTERNS = [
  /قال\s+([\u0600-\u06FF]{2,20})/g,
  /قالت\s+([\u0600-\u06FF]{2,20})/g,
  /أجاب\s+([\u0600-\u06FF]{2,20})/g,
  /أجابت\s+([\u0600-\u06FF]{2,20})/g,
  /صاح\s+([\u0600-\u06FF]{2,20})/g,
  /صاحت\s+([\u0600-\u06FF]{2,20})/g,
  /همس\s+([\u0600-\u06FF]{2,20})/g,
  /همست\s+([\u0600-\u06FF]{2,20})/g,
  /نظر\s+([\u0600-\u06FF]{2,20})/g,
  /نظرت\s+([\u0600-\u06FF]{2,20})/g,
  /رأى\s+([\u0600-\u06FF]{2,20})/g,
  /رأت\s+([\u0600-\u06FF]{2,20})/g,
  /سمع\s+([\u0600-\u06FF]{2,20})/g,
  /فكر\s+([\u0600-\u06FF]{2,20})/g,
  /فكرت\s+([\u0600-\u06FF]{2,20})/g,
  /شعر\s+([\u0600-\u06FF]{2,20})/g,
  /عرف\s+([\u0600-\u06FF]{2,20})/g,
  /تذكر\s+([\u0600-\u06FF]{2,20})/g,
  /تذكرت\s+([\u0600-\u06FF]{2,20})/g,
  /ابتسم\s+([\u0600-\u06FF]{2,20})/g,
  /ابتسمت\s+([\u0600-\u06FF]{2,20})/g,
  /التفت\s+([\u0600-\u06FF]{2,20})/g,
  /التفتت\s+([\u0600-\u06FF]{2,20})/g,
  /أومأ\s+([\u0600-\u06FF]{2,20})/g,
  /أومأت\s+([\u0600-\u06FF]{2,20})/g,
  /مشى\s+([\u0600-\u06FF]{2,20})/g,
  /وقف\s+([\u0600-\u06FF]{2,20})/g,
  /جلس\s+([\u0600-\u06FF]{2,20})/g,
];

function normalizeArabic(name) {
  return name
    .replace(/[\u064B-\u0652]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelyName(word) {
  // Skip stopwords
  if (STOPWORDS.has(word)) return false;
  // Skip very short words
  if (word.length < 3) return false;
  // Skip words that are just "ال" + something common
  if (word.startsWith('ال') && word.length < 5) return false;
  // Skip words with numbers
  if (/\d/.test(word)) return false;
  // Skip pure Latin
  if (/^[a-zA-Z]+$/.test(word)) return false;
  return true;
}

console.log('=== Comprehensive Character Extraction ===');
console.log('Loading all chapters...');

const chapters = await db.chapter.findMany({
  select: { id: true, number: true, content: true },
  orderBy: { number: 'asc' },
});

console.log(`Loaded ${chapters.length} chapters`);

// Collect name candidates with their frequency and chapter appearances
const nameCandidates = new Map(); // name → { count, chapters: Set<number> }

console.log('\nExtracting names from chapters...');
let processed = 0;
for (const ch of chapters) {
  const content = ch.content || '';
  
  // Method 1: Pattern-based extraction (said X, answered X, etc.)
  for (const pattern of NAME_PATTERNS) {
    let match;
    const re = new RegExp(pattern.source, 'g');
    while ((match = re.exec(content)) !== null) {
      const name = match[1].trim();
      if (isLikelyName(name)) {
        if (!nameCandidates.has(name)) {
          nameCandidates.set(name, { count: 0, chapters: new Set() });
        }
        nameCandidates.get(name).count++;
        nameCandidates.get(name).chapters.add(ch.number);
      }
    }
  }
  
  // Method 2: Title-based extraction (الأمير X, الدوق X, etc.)
  for (const title of TITLES) {
    const titlePattern = new RegExp(`${title}\\s+([\\u0600-\\u06FF]{2,25})`, 'g');
    let match;
    while ((match = titlePattern.exec(content)) !== null) {
      const name = match[1].trim();
      if (isLikelyName(name)) {
        if (!nameCandidates.has(name)) {
          nameCandidates.set(name, { count: 0, chapters: new Set() });
        }
        nameCandidates.get(name).count++;
        nameCandidates.get(name).chapters.add(ch.number);
      }
    }
  }
  
  processed++;
  if (processed % 500 === 0) {
    console.log(`  Processed ${processed}/${chapters.length} chapters, ${nameCandidates.size} name candidates so far`);
  }
}

console.log(`\nTotal name candidates: ${nameCandidates.size}`);

// Filter: keep names that appear at least 2 times OR in at least 2 chapters
const validNames = [];
for (const [name, data] of nameCandidates) {
  if (data.count >= 2 || data.chapters.size >= 2) {
    validNames.push({ name, count: data.count, chapters: Array.from(data.chapters).sort((a, b) => a - b) });
  }
}

console.log(`Valid names (>= 2 mentions): ${validNames.length}`);

// Load existing characters to avoid duplicates
const existingChars = await db.character.findMany({ select: { id: true, name: true, imageUrl: true, nameEn: true } });
const existingByName = new Map();
for (const c of existingChars) {
  existingByName.set(normalizeArabic(c.name), c);
}

// Create new characters for names not in DB
console.log('\nCreating new characters...');
let created = 0;
let updated = 0;
const charToChapters = []; // {charId, chapterNumbers}

for (const vn of validNames) {
  const normName = normalizeArabic(vn.name);
  let char = existingByName.get(normName);
  
  if (!char) {
    // Create new character
    try {
      char = await db.character.create({
        data: {
          name: vn.name,
          nameEn: null,
          imageUrl: null,
          description: '',
          isMain: false,
          color: null,
        },
      });
      existingByName.set(normName, char);
      created++;
    } catch (e) {
      // Duplicate name, skip
      continue;
    }
  }
  
  charToChapters.push({ charId: char.id, charName: vn.name, chapters: vn.chapters });
}

console.log(`Created ${created} new characters`);
console.log(`Total characters now: ${existingChars.length + created}`);

// Now create ChapterCharacter records
console.log('\nLinking characters to chapters...');
let totalLinks = 0;
let charsLinked = 0;

for (const { charId, chapters: chNums } of charToChapters) {
  if (chNums.length === 0) continue;
  
  // Get chapter IDs
  const chRecords = await db.chapter.findMany({
    where: { number: { in: chNums } },
    select: { id: true, number: true },
  });
  
  for (const ch of chRecords) {
    try {
      await db.chapterCharacter.create({
        data: { chapterId: ch.id, characterId: charId, paragraphIndex: 0, wordIndex: 0 }
      });
      totalLinks++;
    } catch (e) {
      // duplicate — skip
    }
  }
  charsLinked++;
  if (charsLinked % 50 === 0) {
    console.log(`  Linked ${charsLinked}/${charToChapters.length} characters, ${totalLinks} appearances`);
  }
}

console.log(`\nDone! Linked ${charsLinked} characters with ${totalLinks} total appearances`);

// Final stats
const finalCount = await db.character.count();
const finalWithImg = await db.character.count({ where: { NOT: { OR: [{ imageUrl: null }, { imageUrl: '' }] } } });
const finalWithApps = await db.chapterCharacter.groupBy({ by: ['characterId'] });
console.log(`\n=== FINAL STATS ===`);
console.log(`Total characters: ${finalCount}`);
console.log(`With images: ${finalWithImg}`);
console.log(`Without images: ${finalCount - finalWithImg}`);
console.log(`Characters with appearances: ${finalWithApps.length}`);

await db.$disconnect();
console.log('Done!');

// AI-powered character name classification
// Sends batches of candidate names to LLM, keeps only real character names

import ZAI from 'z-ai-web-dev-sdk';
import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL = 'file:/home/z/my-project/db/custom.db';
const db = new PrismaClient();

console.log('=== AI Character Name Classification ===');

// Load all characters
const allChars = await db.character.findMany({
  select: { id: true, name: true },
  orderBy: { id: 'asc' },
});
console.log(`Total characters to classify: ${allChars.length}`);

// Initialize AI
const zai = await ZAI.create();

// Process in batches of 40
const BATCH_SIZE = 40;
const validCharIds = new Set();
const invalidNames = [];

for (let i = 0; i < allChars.length; i += BATCH_SIZE) {
  const batch = allChars.slice(i, i + BATCH_SIZE);
  const namesList = batch.map((c, idx) => `${idx + 1}. ${c.name}`).join('\n');

  const prompt = `أنت خبير في اللغة العربية والأدب. مهمتك: تحديد أي من هذه الكلمات هي أسماء شخصيات حقيقية (أسماء علم) وأيها ليست.

قائمة الكلمات:
${namesList}

القواعد:
- "اسم شخصية" = اسم علم خاص بشخص (مثل: روبين، قيصر، آرو، بيلي، ريتشارد، زافاروس، مارليك)
- "ليس اسم شخصية" = ضمير (هو، هي، أنتم، نحن)، فعل (قال، ذهب، ابتسم)، اسم عام (رجل، مدينة، إدارة، ابتسامة، حرب، طاقة)، صفة (كبير، جميل)، حرف جر، ظرف زمان/مكان

أرجع ONLY أرقام الكلمات التي هي أسماء شخصيات حقيقية، مفصولة بفواصل.
مثال: 1,3,5,7,9

أرقام أسماء الشخصيات فقط:`;

  try {
    const completion = await zai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 200,
    });

    const response = completion.choices?.[0]?.message?.content?.trim() || '';
    // Extract numbers
    const numbers = response.match(/\d+/g)?.map(Number) || [];

    for (const num of numbers) {
      if (num >= 1 && num <= batch.length) {
        validCharIds.add(batch[num - 1].id);
      }
    }

    // Mark invalid ones
    for (const c of batch) {
      if (!validCharIds.has(c.id)) {
        invalidNames.push(c);
      }
    }

    console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allChars.length / BATCH_SIZE)}: ${numbers.length} valid, ${batch.length - numbers.length} invalid`);
  } catch (e) {
    console.error(`Batch ${i} error:`, e.message);
    // On error, keep all in batch (safer)
    for (const c of batch) {
      validCharIds.add(c.id);
    }
  }

  // Small delay
  await new Promise(r => setTimeout(r, 300));
}

console.log(`\n=== Results ===`);
console.log(`Valid characters: ${validCharIds.size}`);
console.log(`Invalid (to delete): ${allChars.length - validCharIds.size}`);

// Show sample of invalid names
console.log(`\nSample invalid names (will be deleted):`);
invalidNames.slice(0, 30).forEach(c => console.log(`  ${c.name}`));

// Delete invalid characters
console.log(`\n=== Deleting ${invalidNames.length} invalid characters ===`);

// First delete their appearances and relations (cascade)
const invalidIds = invalidNames.map(c => c.id);
if (invalidIds.length > 0) {
  await db.chapterCharacter.deleteMany({ where: { characterId: { in: invalidIds } } });
  await db.characterRelation.deleteMany({
    where: { OR: [{ fromId: { in: invalidIds } }, { toId: { in: invalidIds } }] }
  });
  // Delete in batches to avoid SQL too many variables
  for (let i = 0; i < invalidIds.length; i += 500) {
    const chunk = invalidIds.slice(i, i + 500);
    await db.character.deleteMany({ where: { id: { in: chunk } } });
  }
}

const finalCount = await db.character.count();
const finalWithImg = await db.character.count({ where: { NOT: { OR: [{ imageUrl: null }, { imageUrl: '' }] } } });
console.log(`\n=== FINAL ===`);
console.log(`Total characters: ${finalCount}`);
console.log(`With images: ${finalWithImg}`);
console.log(`Without images: ${finalCount - finalWithImg}`);

await db.$disconnect();
console.log('Done!');

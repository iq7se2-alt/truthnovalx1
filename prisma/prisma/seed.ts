import { db } from "../src/lib/db"

const CHAPTER_1_CONTENT = `في صباح احد الأيام في سوق مدينة يورا

مدينة كبيرة تحكمها واحدة من اكبر عائلات الدوقية -عائلة بورتون- مما يجعل السوق فيها مزدحم دائماً

بين صراخ الباعة و تدافع المشترون .. كانت المناقشات حول مختلف المواضيع تدب في كل مكان، لكن موضوع واحد خصيصاً كان مثير للإهتمام للكثيرين..

*ماذا سيحدث في البطولة التي سيقيمها الدوق آلتون لهذه السنة؟*

"هاي.. من تظنه سيكسب بطولة الشباب هذه السنة؟"
"أهنالك غيره ؟ بالتأكيد روبين بورتون!"
"هيه~ معك حق.. عائلة بورتون كسبت نابغة حقيقي مؤخراً، مع ان في جيله العديد من العباقرة إلا انه ببساطة طاغي عليهم"

محادثات كهذه يمكن سماعها في انحاء المدينة. اثناء القيل و القال اخترق مراهقان طريقهما مبتسمان في وسط الطريق، قال احدهما:
"أتسمع هذا يا روبين؟ يبدو ان فوزك قد تقرر قبل حتى ان تدخل الحلبة"

روبين لم يقاتل في حياته! كان دائماً متفوق بمستويين او ثلاث عن فئته العمرية مما جعل أقرانه يشعرون بالرهبة من مجرد الاقتراب منه.

ضحك روبين: "و ما الفائدة من تلك المنافسات السخيفة ؟ انا لا اريد حتى الانضمام لها! هاي، بيلي.. لما لا تشارك انت؟ اعتقد ان لديك فرصة جيدة"

"انا ؟! لا تمزح معي.. انت العبقري الوحيد في جيلنا الذي وصل للمستوى العاشر من تأسيس الطاقة! اقوى شخص بعدك في الطبقة السابعة، و هو اكبر منك بعامين!! انا بالكاد في الطبقة الخامسة، اخشى انه سيتم اوساعي ضرباً"

رد عليه روبين: "و ما المشكلة؟ فقط ادخل و قم بما في وسعك، أليس هذا ما يهم؟"`

function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).filter(Boolean).length
}

async function main() {
  // Site settings (singleton id=1)
  await db.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      coverImageUrl: "/cover.jpg",
      novelTitle: "سيد الحقيقة",
      novelTitleEn: "Lord of the Truth",
      novelDescription:
        "روبين بورتون، شاب وُلد فوجد نفسه لديه الموهبة والعائلة القوية والذكاء — ما عدا شيء واحد.. الرغبة في استعمال كل هذا!",
    },
  })

  // Chapter 1
  await db.chapter.upsert({
    where: { number: 1 },
    update: {},
    create: {
      number: 1,
      title: "عبقري",
      content: CHAPTER_1_CONTENT,
      wordCount: countWords(CHAPTER_1_CONTENT),
    },
  })

  const settings = await db.siteSettings.findUnique({ where: { id: 1 } })
  const chapters = await db.chapter.count()
  console.log("✓ Seed complete")
  console.log("  Settings:", settings)
  console.log("  Chapters count:", chapters)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })

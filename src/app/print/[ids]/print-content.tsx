"use client";

export function PrintPageContent({
  chapters,
}: {
  chapters: Array<{
    number: number;
    title: string;
    content: string;
  }>;
}) {
  return (
    <>
      <div className="print-bar">
        <button onClick={() => window.print()}>🖨️ طباعة / حفظ PDF</button>
        <a href="/chapters">← رجوع</a>
      </div>

      <div className="doc-header">
        <h1>سيد الحقيقة</h1>
        <div className="sub">Lord of the Truth</div>
      </div>

      {chapters.map((ch) => {
        const paragraphs = ch.content
          .split(/\n\s*\n+/)
          .map((p) => p.trim())
          .filter(Boolean);
        return (
          <div key={ch.number} className="chapter">
            <div className="chapter-header">
              <div className="chapter-eyebrow">فصل {ch.number}</div>
              <h2 className="chapter-title">{ch.title}</h2>
              <div className="chapter-rule" />
            </div>
            <div className="chapter-body">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

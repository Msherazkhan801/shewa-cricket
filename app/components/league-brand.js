export default function LeagueBrand({ subtitle, compact = false }) {
  return (
    <div className={`league-brand${compact ? " compact" : ""}`}>
      <h1 className="league-title" dir="rtl" lang="ur">
        <span className="league-name">یوسفزئی شیوہ سپر لیگ</span>
        
        <span className="league-edition">آٹھواں ایڈیشن 2026-27 <span aria-hidden="true">🏏</span></span>
      </h1>
      {subtitle && <span className="league-caption" dir="ltr">{subtitle}</span>}
    </div>
  );
}

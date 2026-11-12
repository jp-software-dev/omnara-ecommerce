import type { ReactNode } from "react";

export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  items?: string[];
};

// Renders a legal page (terms, privacy notice) from plain data so the text lives
// in one place per language and the layout stays identical across documents.
export function LegalDocument({
  title,
  updated,
  intro,
  sections,
  footer,
}: {
  title: string;
  updated: string;
  intro?: string;
  sections: LegalSection[];
  footer?: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-xs text-muted-foreground">{updated}</p>
      {intro ? <p className="mt-4 text-sm text-muted-foreground">{intro}</p> : null}

      <div className="mt-6 space-y-6">
        {sections.map((section, index) => (
          <section key={section.heading}>
            <h2 className="text-base font-semibold">
              {index + 1}. {section.heading}
            </h2>
            <div className="mt-2 space-y-2 text-sm text-muted-foreground">
              {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.items ? (
                <ul className="list-disc space-y-1 pl-5">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>
        ))}
      </div>

      {footer ? <div className="mt-8 border-t pt-4 text-sm">{footer}</div> : null}
    </main>
  );
}

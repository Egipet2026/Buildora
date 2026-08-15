interface LegalSection {
  heading: string;
  paragraphs?: string[];
  list?: string[];
}

/** Consistent layout for the placeholder legal documents. */
export function LegalDoc({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <h1 className="display text-[2.25rem] lg:text-[2.75rem]">{title}</h1>
      <p className="mt-3 text-[0.8125rem] text-[var(--color-ink-3)]">
        Last updated: {updated}
      </p>

      <div className="mt-10 space-y-10">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-semibold tracking-[-0.02em]">
              {section.heading}
            </h2>

            {section.paragraphs?.map((p) => (
              <p
                key={p}
                className="mt-3.5 leading-relaxed text-[var(--color-ink-2)]"
              >
                {p}
              </p>
            ))}

            {section.list ? (
              <ul className="mt-4 space-y-2.5">
                {section.list.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span
                      className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-ink-3)]"
                      aria-hidden
                    />
                    <span className="leading-relaxed text-[var(--color-ink-2)]">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </>
  );
}

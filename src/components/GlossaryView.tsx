import { allTerms } from '../data/glossary'

export function GlossaryView() {
  return (
    <div className="glossary">
      <p className="glossary__intro">遇到不懂的词,随时回来查。</p>
      {allTerms().map((e) => (
        <div key={e.term} className="glossary__item">
          <h3>{e.term}</h3>
          <p>{e.short}</p>
        </div>
      ))}
    </div>
  )
}

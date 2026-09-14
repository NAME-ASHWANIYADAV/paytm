import { MemoryGraph } from '../components/MemoryGraph'

/**
 * The knowledge graph at the size it deserves.
 *
 * In the rail this lived in a box about 330x150 pixels, which is why it had to be culled to 26
 * nodes to stay legible at all. Here it keeps its shape, and a recall lights the path it walked.
 */
export function MemoryPage(): JSX.Element {
  return (
    <main className="page">
      <header className="page__head">
        <h1 className="page__title deva" lang="hi">
          याददाश्त
        </h1>
        <p className="page__lede">
          What MunshiJi remembers about the shop, and how it found it. Ask something and the nodes
          it walked light up — vector similarity picks the seeds, graph traversal returns the
          relationships between them.
        </p>
      </header>
      <div className="page__body page__body--memory">
        <MemoryGraph variant="page" />
      </div>
    </main>
  )
}

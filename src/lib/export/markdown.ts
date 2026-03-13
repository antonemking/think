import { db } from '@/lib/db';
import { cards, edges, workspaces } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function exportWorkspaceToMarkdown(workspaceId: string): Promise<string> {
  const workspace = db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
  if (!workspace) throw new Error('Workspace not found');

  const allCards = db.select().from(cards).where(eq(cards.workspaceId, workspaceId)).all();
  const allEdges = db.select().from(edges).where(eq(edges.workspaceId, workspaceId)).all();

  const cardMap = new Map(allCards.map(c => [c.id, c]));
  const lines: string[] = [];

  lines.push(`# ${workspace.name}`);
  if (workspace.description) {
    lines.push('', workspace.description);
  }
  lines.push('', `> Exported from Think Canvas on ${new Date().toLocaleDateString()}`, '');

  // Notes
  const notes = allCards.filter(c => c.type === 'note');
  if (notes.length > 0) {
    lines.push('## Notes', '');
    for (const note of notes) {
      lines.push(`### ${note.title || 'Untitled Note'}`);
      if (note.content) {
        // Strip HTML tags for markdown output
        const text = note.content.replace(/<[^>]*>/g, '').trim();
        if (text) lines.push('', text);
      }
      lines.push('');
    }
  }

  // Concepts
  const concepts = allCards.filter(c => c.type === 'concept');
  if (concepts.length > 0) {
    lines.push('## Concepts', '');
    for (const concept of concepts) {
      lines.push(`- **${concept.title}**`);
    }
    lines.push('');
  }

  // Documents & PDFs
  const docs = allCards.filter(c => c.type === 'pdf' || c.type === 'document');
  if (docs.length > 0) {
    lines.push('## Documents', '');
    for (const doc of docs) {
      lines.push(`### ${doc.title}`);
      lines.push(`- Type: ${doc.type.toUpperCase()}`);
      if (doc.sourcePath) lines.push(`- File: ${doc.sourcePath}`);
      if (doc.searchText) {
        const preview = doc.searchText.substring(0, 500);
        lines.push('', '> **Text Preview:**', `> ${preview}${doc.searchText.length > 500 ? '...' : ''}`);
      }
      lines.push('');
    }
  }

  // Connections
  if (allEdges.length > 0) {
    lines.push('## Connections', '');
    for (const edge of allEdges) {
      const source = cardMap.get(edge.sourceCardId);
      const target = cardMap.get(edge.targetCardId);
      if (source && target) {
        const label = edge.label ? ` --[${edge.label}]--> ` : ' --> ';
        lines.push(`- **${source.title || 'Untitled'}**${label}**${target.title || 'Untitled'}**`);
      }
    }
    lines.push('');
  }

  // Spatial layout summary
  lines.push('## Spatial Layout', '');
  lines.push('Cards arranged on canvas (approximate positions):', '');
  const sorted = [...allCards].sort((a, b) => (a.positionY ?? 0) - (b.positionY ?? 0));
  for (const card of sorted) {
    lines.push(`- [${card.type}] "${card.title || 'Untitled'}" at (${Math.round(card.positionX ?? 0)}, ${Math.round(card.positionY ?? 0)})`);
  }

  return lines.join('\n');
}

import type { Node, Edge } from '@xyflow/react';

export type CardType = 'note' | 'concept' | 'pdf' | 'document' | 'image' | 'portal' | 'reference';

export interface CardData extends Record<string, unknown> {
  cardId: string;
  title: string;
  content: string;
  type: CardType;
  fileUrl?: string;
  thumbnailUrl?: string;
  color?: string;
  pageCount?: number;
  sourcePath?: string;
  // Portal fields
  targetWorkspaceId?: string;
  targetWorkspaceName?: string;
  cardCount?: number;
  // Reference fields
  sourceCardId?: string;
  sourceWorkspaceName?: string;
  sourceCardType?: string;
  createdAt?: string;
}

export type ThinkNode = Node<CardData>;
export type ThinkEdge = Edge;

export interface Workspace {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  pinned: number;
  createdAt: string;
  updatedAt: string;
}

export interface CardRecord {
  id: string;
  workspaceId: string;
  type: string;
  title: string;
  content: string;
  positionX: number;
  positionY: number;
  width: number | null;
  height: number | null;
  sourcePath: string | null;
  thumbnailPath: string | null;
  sourceCardId: string | null;
  metadata: string;
  searchText: string;
  createdAt: string;
  updatedAt: string;
}

export interface EdgeRecord {
  id: string;
  workspaceId: string;
  sourceCardId: string;
  targetCardId: string;
  label: string;
  edgeType: string;
  createdAt: string;
}

import { sqliteTable, text, real, index } from 'drizzle-orm/sqlite-core';

export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  icon: text('icon'),
  pinned: real('pinned').default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const cards = sqliteTable('cards', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull().default(''),
  content: text('content').notNull().default(''),
  positionX: real('position_x').notNull().default(0),
  positionY: real('position_y').notNull().default(0),
  width: real('width').default(280),
  height: real('height').default(200),
  sourcePath: text('source_path'),
  thumbnailPath: text('thumbnail_path'),
  sourceCardId: text('source_card_id'),
  metadata: text('metadata').notNull().default('{}'),
  searchText: text('search_text').notNull().default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_cards_workspace').on(table.workspaceId),
  index('idx_cards_source').on(table.sourceCardId),
]);

export const drawings = sqliteTable('drawings', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  pathData: text('path_data').notNull(),
  color: text('color').notNull().default('#000000'),
  strokeWidth: real('stroke_width').notNull().default(2),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_drawings_workspace').on(table.workspaceId),
]);

export const edges = sqliteTable('edges', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  sourceCardId: text('source_card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  targetCardId: text('target_card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  label: text('label').notNull().default(''),
  edgeType: text('edge_type').notNull().default('relation'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_edges_workspace').on(table.workspaceId),
]);

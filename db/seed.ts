import { db } from './client';
import { relationshipTags } from './schema';
import { DEFAULT_RELATIONSHIP_TAGS } from '@/lib/constants';

export async function seedRelationshipTags() {
  const existing = await db.select().from(relationshipTags);
  if (existing.length > 0) return;

  await db.insert(relationshipTags).values(
    DEFAULT_RELATIONSHIP_TAGS.map((name) => ({ name, isSystemDefault: true }))
  );
}

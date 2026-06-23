import type { Advantage, ClassId, RoomType } from '../../shared/game';
import { CLASS_INFO, type ClassInfo } from '../../shared/classes';

// Re-exported from the shared module so the server engine and the client
// character screen read one source of truth for class data.
export type ClassDefinition = ClassInfo;
export const CLASSES = CLASS_INFO;

// Recasts a class's room affinity as tabletop advantage: a strength grants
// advantage, a weakness imposes disadvantage, and everything else rolls normally.
export function classAdvantage(
  classId: ClassId,
  roomType: RoomType
): Advantage {
  const affinity = CLASSES[classId].affinities[roomType] ?? 0;
  if (affinity > 0) return 'advantage';
  if (affinity < 0) return 'disadvantage';
  return 'normal';
}
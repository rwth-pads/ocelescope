/**
 * Generated by orval v7.9.0 🍺
 * Do not edit manually.
 * OCEAn
 * OpenAPI spec version: 0.9.12
 */
import type { OcelEntityTimestamp } from './ocelEntityTimestamp';
import type { OcelEntityAttributes } from './ocelEntityAttributes';
import type { OcelEntityRelations } from './ocelEntityRelations';

export interface OcelEntity {
  id: string;
  timestamp?: OcelEntityTimestamp;
  attributes: OcelEntityAttributes;
  relations: OcelEntityRelations;
}

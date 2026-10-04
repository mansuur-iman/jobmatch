#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/cbe86d9549a1d036e5031f8eb9b3e94b70744867e3e65bf6d2b0f3281417d81d/contract';
import startContract from '../../snapshots/cbe86d9549a1d036e5031f8eb9b3e94b70744867e3e65bf6d2b0f3281417d81d/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/dc8b892823622a46d14b4bbcddaf3c337fcd8b6f7f8e201a232f849d5ce8ec48/contract';
import endContract from '../../snapshots/dc8b892823622a46d14b4bbcddaf3c337fcd8b6f7f8e201a232f849d5ce8ec48/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'JobAnalysis',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('jobText', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('result', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.dropNotNull({ schema: 'public', table: 'Profile', column: 'experience' }),
      this.createIndex({
        schema: 'public',
        table: 'JobAnalysis',
        index: 'JobAnalysis_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'JobAnalysis',
        foreignKey: {
          name: 'JobAnalysis_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

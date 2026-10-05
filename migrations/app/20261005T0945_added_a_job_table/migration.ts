#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/527cc8abf28c9322fe6e40007e3f3a4e3d3c3136a0a8a82e8f0ce77982761ccd/contract';
import endContract from '../../snapshots/527cc8abf28c9322fe6e40007e3f3a4e3d3c3136a0a8a82e8f0ce77982761ccd/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/dc8b892823622a46d14b4bbcddaf3c337fcd8b6f7f8e201a232f849d5ce8ec48/contract';
import startContract from '../../snapshots/dc8b892823622a46d14b4bbcddaf3c337fcd8b6f7f8e201a232f849d5ce8ec48/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Job',
        columns: [
          col('aiIndexed', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('applyUrl', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('company', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('companyLogo', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('companyWebsite', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('employmentType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('externalJobId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('location', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('maxSalary', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('minSalary', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('postedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('requiredSkills', 'text[]', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Job_requiredSkills_elem_not_null_42133848',
            'array_position("requiredSkills", NULL) IS NULL',
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Job',
        constraint: 'Job_externalJobId_key',
        columns: ['externalJobId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

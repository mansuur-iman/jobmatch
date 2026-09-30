#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/cbe86d9549a1d036e5031f8eb9b3e94b70744867e3e65bf6d2b0f3281417d81d/contract';
import endContract from '../../snapshots/cbe86d9549a1d036e5031f8eb9b3e94b70744867e3e65bf6d2b0f3281417d81d/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'Profile',
        columns: [
          col('availability', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('certifications', 'text[]', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('degree', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('experience', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('jobLevel', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('languages', 'text[]', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('projects', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('roles', 'text[]', { notNull: true, codecRef: { codecId: 'pg/text@1', many: true } }),
          col('skills', 'text[]', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('university', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('workEnvironment', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('workLocation', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Profile_certifications_elem_not_null_e7bbbdcb',
            'array_position("certifications", NULL) IS NULL',
          ),
          checkExpression(
            'Profile_languages_elem_not_null_d4aa0a00',
            'array_position("languages", NULL) IS NULL',
          ),
          checkExpression(
            'Profile_roles_elem_not_null_37524d49',
            'array_position("roles", NULL) IS NULL',
          ),
          checkExpression(
            'Profile_skills_elem_not_null_79c19a4f',
            'array_position("skills", NULL) IS NULL',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'User',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('password', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('username', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Profile',
        constraint: 'Profile_userId_key',
        columns: ['userId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'User',
        constraint: 'User_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'User',
        constraint: 'User_username_key',
        columns: ['username'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Profile',
        foreignKey: {
          name: 'Profile_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

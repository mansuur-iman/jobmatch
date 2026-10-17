#!/usr/bin/env -S node
import type { Contract as Start } from "../../snapshots/527cc8abf28c9322fe6e40007e3f3a4e3d3c3136a0a8a82e8f0ce77982761ccd/contract";
import startContract from "../../snapshots/527cc8abf28c9322fe6e40007e3f3a4e3d3c3136a0a8a82e8f0ce77982761ccd/contract.json" with { type: "json" };

import type { Contract as End } from "../../snapshots/decd8dd5dc949e1a3d473d6e4b7dbe1e5b2e655b3491edd3450e3ab8abbc8388/contract";
import endContract from "../../snapshots/decd8dd5dc949e1a3d473d6e4b7dbe1e5b2e655b3491edd3450e3ab8abbc8388/contract.json" with { type: "json" };

import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from "@prisma/orm-postgres/migration";

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: "public",
        table: "Recommendation",
        columns: [
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn("now()"),
            codecRef: { codecId: "pg/timestamptz-string@1" },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("jobId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("score", "float8", {
            notNull: true,
            codecRef: { codecId: "pg/float8@1" },
          }),
          col("status", "text", {
            notNull: true,
            default: lit("new"),
            codecRef: { codecId: "pg/text@1" },
          }),
          col("updatedAt", "timestamptz", {
            notNull: true,
            codecRef: { codecId: "pg/timestamptz-string@1" },
          }),
          col("userId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [
          primaryKey(["id"]),
          checkExpression(
            "Recommendation_status_check_ac28c769",
            `"status" IN ('new', 'applied', 'dismissed')`,
          ),
        ],
      }),

      this.dropNotNull({
        schema: "public",
        table: "Job",
        column: "minSalary",
      }),

      this.dropNotNull({
        schema: "public",
        table: "Job",
        column: "maxSalary",
      }),

      this.dropNotNull({
        schema: "public",
        table: "Job",
        column: "companyLogo",
      }),

      this.dropNotNull({
        schema: "public",
        table: "Job",
        column: "companyWebsite",
      }),

      this.dropNotNull({
        schema: "public",
        table: "Job",
        column: "postedAt",
      }),

      this.createIndex({
        schema: "public",
        table: "Recommendation",
        index: "Recommendation_jobId_idx_623c8f77",
        columns: ["jobId"],
      }),

      this.createIndex({
        schema: "public",
        table: "Recommendation",
        index: "Recommendation_userId_idx_a489d58a",
        columns: ["userId"],
      }),

      this.createIndex({
        schema: "public",
        table: "Recommendation",
        index: "Recommendation_userId_status_score_idx_68241db6",
        columns: ["userId", "status", "score"],
      }),

      this.addUnique({
        schema: "public",
        table: "Recommendation",
        constraint: "Recommendation_userId_jobId_key",
        columns: ["userId", "jobId"],
      }),

      this.dropConstraint({
        schema: "public",
        table: "Profile",
        constraint: "Profile_userId_fkey",
      }),

      this.addForeignKey({
        schema: "public",
        table: "Profile",
        foreignKey: {
          name: "Profile_userId_fkey",
          columns: ["userId"],
          references: {
            schema: "public",
            table: "User",
            columns: ["id"],
          },
          onDelete: "cascade",
        },
      }),

      this.dropConstraint({
        schema: "public",
        table: "JobAnalysis",
        constraint: "JobAnalysis_userId_fkey",
      }),

      this.addForeignKey({
        schema: "public",
        table: "JobAnalysis",
        foreignKey: {
          name: "JobAnalysis_userId_fkey",
          columns: ["userId"],
          references: {
            schema: "public",
            table: "User",
            columns: ["id"],
          },
          onDelete: "cascade",
        },
      }),

      this.addForeignKey({
        schema: "public",
        table: "Recommendation",
        foreignKey: {
          name: "Recommendation_userId_fkey",
          columns: ["userId"],
          references: {
            schema: "public",
            table: "User",
            columns: ["id"],
          },
          onDelete: "cascade",
        },
      }),

      this.addForeignKey({
        schema: "public",
        table: "Recommendation",
        foreignKey: {
          name: "Recommendation_jobId_fkey",
          columns: ["jobId"],
          references: {
            schema: "public",
            table: "Job",
            columns: ["id"],
          },
          onDelete: "cascade",
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

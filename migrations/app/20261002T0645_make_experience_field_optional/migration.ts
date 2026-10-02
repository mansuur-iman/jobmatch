#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/11202595b8555f347d8ac4d2ab7ee9a8976b02bbd333a8ecbcaad716646e0d64/contract';
import endContract from '../../snapshots/11202595b8555f347d8ac4d2ab7ee9a8976b02bbd333a8ecbcaad716646e0d64/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/cbe86d9549a1d036e5031f8eb9b3e94b70744867e3e65bf6d2b0f3281417d81d/contract';
import startContract from '../../snapshots/cbe86d9549a1d036e5031f8eb9b3e94b70744867e3e65bf6d2b0f3281417d81d/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [this.dropNotNull({ schema: 'public', table: 'Profile', column: 'experience' })];
  }
}

MigrationCLI.run(import.meta.url, M);

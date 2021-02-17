//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import { ApiPromise } from '@polkadot/api';
import {AccountInfo} from '@polkadot/types/interfaces/system';
import promisifySubstrate from './promisify-substrate';

export default async function getBalance(api: ApiPromise, accounts: string[]): Promise<Array<bigint>> {
  const balance = promisifySubstrate(api, (acc: string[]) => api.query.system.account.multi(acc));
  const responce = await balance(accounts) as unknown as AccountInfo[];
  return responce.map((r) => r.data.free.toBigInt().valueOf());
}

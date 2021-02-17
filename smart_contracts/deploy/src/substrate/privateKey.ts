//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import { Keyring } from "@polkadot/api";
import { IKeyringPair } from "@polkadot/types/types";

export default function privateKey(account: string): IKeyringPair {
  const keyring = new Keyring({ type: 'sr25519' });
  
  return keyring.addFromUri(account);
}
//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import process from 'process';

const config = {
  substrateUrl: process.env.substrateUrl || 'ws://127.0.0.1:9944'
}

export default config;
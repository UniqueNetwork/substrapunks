//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import { ApiPromise } from "@polkadot/api";

type PromiseType<T> = T extends PromiseLike<infer TInner> ? TInner : T;

export default function promisifySubstrate<T extends (...args: any[]) => any>(api: ApiPromise, action: T): (...args: Parameters<T>) => Promise<PromiseType<ReturnType<T>>> {
  return (...args: Parameters<T>) => {
    const promise = new Promise<PromiseType<ReturnType<T>>>((resolve: ((result: PromiseType<ReturnType<T>>) => void) | undefined, reject: ((error: any) => void) | undefined) => {
      const cleanup = () => {
        api.off('disconnected', fail);
        api.off('error', fail);
        resolve = undefined;
        reject = undefined;
      };

      const success = (r: any) => {
        resolve && resolve(r);
        cleanup();
      };
      const fail = (error: any) => {
        reject && reject(error);
        cleanup();
      };
      
      api.on('disconnected', fail);
      api.on('error', fail);

      const result = action(...args);
      Promise.resolve(result)
        .then(success, fail);

    });
    return promise as any;
  };
}

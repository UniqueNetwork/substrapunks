#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;

#[ink::contract(version = "0.1.0", env = NodeRuntimeTypes)]
mod calls {
    use ink_core::env;
    use ink_prelude::*;
    use ink_types_node_runtime::{calls as runtime_calls, NodeRuntimeTypes};
    use ink_core::storage;

    #[ink(storage)]
    struct Calls {
        /// Stores a single `bool` value for claimed tokens.
        claim_status: storage::HashMap<u64, bool>,z
    }

    impl Calls {
        #[ink(constructor)]
        fn new(&mut self) {}

        /// Transfers token to claimer (`new_owner`) if token belongs to the collection admin
        #[ink(message)]
        fn claim(&mut self, collection_id: u64, item_id: u64, new_owner: AccountId) -> bool {
            let transfer_call = runtime_calls::transfer(collection_id, item_id, new_owner);

            // Was this token claimed yet?
            let claimed = self.claim_status.get(&item_id).unwrap_or(&false);
            
            env::println(&format!(
                "Claim status: {:?}",
                claimed
            ));

            if !claimed {
                // Mark as claimed
                self.claim_status.insert(item_id, true);

                // dispatch the call to the runtime
                let _ = self.env().invoke_runtime(&transfer_call);
                
                return true
            }

            false
        }

    }
}

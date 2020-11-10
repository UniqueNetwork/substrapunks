#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;

#[ink::contract(version = "0.1.0")]
mod matchingengine {
    use ink_core::storage;

    #[ink(storage)]
    struct MatchingEngine {
        /// Contract owner
        owner: storage::Value<AccountId>,

        /// Contract admin (server that will input/output quote currency)
        admin: storage::Value<AccountId>,

        /////////////////////////////////////////////////////////////////////////////////
        // Deposits / Balances / Withdrawals
        
        /// Balances by quote currency ID and address
        /// Quote currency ID:
        /// 1 = Unique (not live yet, so unused for now)
        /// 2 = KSM
        /// 3 = DOT
        /// 4 = EDG
        /// (...) more to come
        quote_balance: storage::HashMap<(u64, AccountId), Balance>,

        /// Total trades counter (resettable)
        total_traded: storage::HashMap<u64, Balance>,

        /// Vault withdraw ledger
        withdraw_queue: storage::HashMap<u128, (AccountId, Balance)>,

        /// Last withdraw id
        last_withdraw_id: storage::Value<u128>,

        /// Recorded NFT deposits
        nft_deposits: storage::HashMap<(u64, u64), AccountId>,

        /// NFT Vault withdraw ledger
        nft_withdraw_queue: storage::HashMap<u128, (AccountId, u64, u64)>,

        /// Last NFT withdraw index
        last_nft_withdraw_id: storage::Value<u128>,

        /////////////////////////////////////////////////////////////////////////////////
        // Asks

        /// Current asks: ask_id -> (collectionId, tokenId, quote_id, price, seller)
        asks: storage::HashMap<u128, (u64, u64, u64, Balance, AccountId)>,

        /// Ask index: Helps find the ask by the colectionId + tokenId
        asks_by_token: storage::HashMap<(u64, u64), u128>,

        /// Last Ask ID
        last_ask_id: storage::Value<u128>,
    }

    impl MatchingEngine {

        #[ink(constructor)]
        fn new(&mut self) {
            // Set contract owner 
            self.owner.set(self.env().caller());

            // Initialize initial value of last withdraw ids
            self.last_withdraw_id.set(0);
            self.last_nft_withdraw_id.set(0);

            // Initialize the last ask ID
            self.last_ask_id.set(0);

            // Init KSM totals
            self.total_traded.insert(2, 0);
        }

        /// Returns the contract owner
        #[ink(message)]
        fn get_owner(&self) -> AccountId {
            *self.owner.get()
        }

        /// Set contract admin
        #[ink(message)]
        fn set_admin(&mut self, admin: AccountId) {
            self.ensure_only_owner();
            self.admin.set(admin);
        }

        /// Get total
        #[ink(message)]
        fn get_total(&self, quote_id: u64) -> Balance{
            *self.total_traded.get(&quote_id).unwrap()
        }
        
        /// Reset total
        #[ink(message)]
        fn reset_total(&mut self, quote_id: u64) {
            self.ensure_only_owner();
            self.total_traded.insert(quote_id, 0);
        }

        /// Admin: Make a deposit for a user
        #[ink(message)]
        fn register_deposit(&mut self, quote_id: u64, deposit_balance: Balance, user: AccountId) {
            self.ensure_only_admin();

            // Check overflow
            let initial_balance = self.balance_of_or_zero(quote_id, &user);
            assert!(initial_balance + deposit_balance > initial_balance);

            // Set or update quote balance
            self.quote_balance.insert((quote_id, user.clone()), initial_balance + deposit_balance);
        }

        /// Get address balance in quote currency
        #[ink(message)]
        fn get_balance(&self, quote_id: u64) -> Balance {
            self.balance_of_or_zero(quote_id, &self.env().caller())
        }

        /// User: Withdraw funds
        #[ink(message)]
        fn withdraw(&mut self, quote_id: u64, withdraw_balance: Balance) {
            self.vault_withdraw(&self.env().caller(), quote_id, withdraw_balance);
        }

        /// Get last withdraw id
        #[ink(message)]
        fn get_last_withdraw_id(&self) -> u128 {
            *self.last_withdraw_id.get()
        }

        /// Get withdraw by id
        #[ink(message)]
        fn get_withdraw_by_id(&self, id: u128) -> (AccountId, Balance) {
            *self.withdraw_queue.get(&id).unwrap()
        }

        /// Get last NFT withdraw id
        #[ink(message)]
        fn get_last_nft_withdraw_id(&self) -> u128 {
            *self.last_nft_withdraw_id.get()
        }

        /// Get NFT withdraw by id
        #[ink(message)]
        fn get_nft_withdraw_by_id(&self, id: u128) -> (AccountId, u64, u64) {
            *self.nft_withdraw_queue.get(&id).unwrap()
        }

        /// Admin: Tell the market about a successful NFT deposit
        #[ink(message)]
        fn register_nft_deposit(&mut self, collection_id: u64, token_id: u64, user: AccountId) {

            self.ensure_only_admin();

            // Record the token deposit for the user
            self.nft_deposits.insert((collection_id, token_id), user.clone());
        }

        /// Get deposit 
        #[ink(message)]
        fn get_nft_deposit(&self, collection_id: u64, token_id: u64) -> AccountId {
            *self.nft_deposits.get(&(collection_id, token_id)).unwrap()
        }

        /// User: Place a deposited NFT for sale
        #[ink(message)]
        fn ask(&mut self, collection_id: u64, token_id: u64, quote_id: u64, price: Balance) {

            // make sure sender owns this deposit (if not called by the admin)
            let deposit_owner = *self.nft_deposits.get(&(collection_id, token_id)).unwrap();
            if self.env().caller() != *self.owner.get() {
                assert_eq!(deposit_owner, self.env().caller());
            }

            // Remove a deposit
            let _ = self.nft_deposits.remove(&(collection_id, token_id));

            // Place an ask (into asks with a new Ask ID)
            let ask_id = self.last_ask_id.get() + 1;
            let ask = (collection_id, token_id, quote_id, price, deposit_owner.clone());
            self.last_ask_id.set(ask_id);
            self.asks.insert(ask_id, ask.clone());

            // Record that token is being sold by this user (in asks_by_token) in reverse lookup index
            self.asks_by_token.insert((collection_id, token_id), ask_id);
        }

        /// Get last ask ID
        #[ink(message)]
        fn get_last_ask_id(&self) -> u128 {
            *self.last_ask_id.get()
        }

        /// Get ask by ID
        #[ink(message)]
        fn get_ask_by_id(&self, ask_id: u128) -> (u64, u64, u64, Balance, AccountId) {
            *self.asks.get(&ask_id).unwrap()
        }

        /// Get ask by token
        #[ink(message)]
        fn get_ask_id_by_token(&self, collection_id: u64, token_id: u64) -> u128 {
            *self.asks_by_token.get(&(collection_id, token_id)).unwrap()
        }

        /// Cancel an ask
        #[ink(message)]
        fn cancel(&mut self, collection_id: u64, token_id: u64) {

            // Ensure that sender owns this ask
            let ask_id = *self.asks_by_token.get(&(collection_id, token_id)).unwrap();
            let (_, _, _, _, user) = *self.asks.get(&ask_id).unwrap();
            if self.env().caller() != *self.owner.get() {
                assert_eq!(self.env().caller(), user);
            }

            // Remove ask from everywhere
            self.remove_ask(collection_id, token_id, ask_id);

            // Transfer token back to user through NFT Vault
            self.last_nft_withdraw_id.set(self.last_nft_withdraw_id.get() + 1);
            self.nft_withdraw_queue.insert(*self.last_nft_withdraw_id.get(), (user, collection_id, token_id));
        }

        /// Match an ask
        #[ink(message)]
        fn buy(&mut self, collection_id: u64, token_id: u64) {

            // Get the ask
            let ask_id = *self.asks_by_token.get(&(collection_id, token_id)).unwrap();
            let (_, _, quote_id, price, seller) = *self.asks.get(&ask_id).unwrap();

            // Check that buyer has enough balance
            let initial_buyer_balance = self.balance_of_or_zero(quote_id, &self.env().caller());
            assert!(initial_buyer_balance >= price);
            
            // Subtract balance from buyer and increase balance of the seller and owner (due to commission)
            let initial_seller_balance = self.balance_of_or_zero(quote_id, &seller);
            assert!(initial_seller_balance + price > initial_seller_balance); // overflow protection
            self.quote_balance.insert((quote_id, self.env().caller().clone()), initial_buyer_balance - price);
            self.quote_balance.insert((quote_id, seller.clone()), initial_seller_balance + price);

            // Remove ask from everywhere
            self.remove_ask(collection_id, token_id, ask_id);

            // Start an NFT withdraw from the vault
            self.last_nft_withdraw_id.set(*self.last_nft_withdraw_id.get() + 1);
            self.nft_withdraw_queue.insert(*self.last_nft_withdraw_id.get(), (self.env().caller().clone(), collection_id, token_id));

            // Start Quote withdraw from the vault for the seller
            self.vault_withdraw(&seller, quote_id, price);

            // Update totals
            let total = *self.total_traded.get(&quote_id).unwrap();
            self.total_traded.insert(quote_id, total + price);
        }

        /// Panic if the sender is not the contract owner
        fn ensure_only_owner(&self) {
            assert_eq!(self.env().caller(), *self.owner.get());
        }

        /// Panic if the sender is not the contract admin
        fn ensure_only_admin(&self) {
            assert_eq!(self.env().caller(), *self.admin.get());
        }

        /// Return address balance in quote currency or 0
        fn balance_of_or_zero(&self, quote_id: u64, user: &AccountId) -> Balance {
            *self.quote_balance.get(&(quote_id, *user)).unwrap_or(&0)
        }

        fn remove_ask(&mut self, collection_id: u64, token_id: u64, ask_id: u128) {
            // Remove the record that token is being sold by this user (from asks_by_token)
            let _ = self.asks_by_token.remove(&(collection_id, token_id));

            // Remove an ask (from asks)
            let _ = self.asks.remove(&ask_id);
        }

        fn vault_withdraw(&mut self, user: &AccountId, quote_id: u64, withdraw_balance: Balance) {
            // Make sure the user has enough
            let initial_balance = self.balance_of_or_zero(quote_id, user);
            assert!(initial_balance >= withdraw_balance);

            // Update user's quote balance
            self.quote_balance.insert((quote_id, (*user).clone()), initial_balance - withdraw_balance);

            // Increase last withdraw index
            self.last_withdraw_id.set(self.last_withdraw_id.get() + 1);

            // Start a withdraw from the vault
            self.withdraw_queue.insert(*self.last_withdraw_id.get(), ((*user).clone(), withdraw_balance));
        }

    }
}


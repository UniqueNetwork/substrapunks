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

        /// Trade commission, per thousand
        trade_fee_per_k: storage::Value<u128>,

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

        /// Vault withdraw ledger
        withdraw_queue: storage::HashMap<u128, (AccountId, Balance)>,

        /// Last withdraw id
        last_withdraw_id: storage::Value<u128>,

        /// Recorded NFT deposits
        nft_deposits: storage::HashMap<(u64, u64), AccountId>,

        // /// NFT Deposit Queue
        // nft_deposit_queue: storage::HashMap<u128, (u64, u64, AccountId)>,

        // /// Last NFT Deposit ID
        // last_nft_deposit_id: storage::Value<u128>,

        /// NFT Vault withdraw ledger
        nft_withdraw_queue: storage::HashMap<u128, (AccountId, u64, u64)>,

        /// Last NFT withdraw index
        last_nft_withdraw_id: storage::Value<u128>,

        /////////////////////////////////////////////////////////////////////////////////
        // Asks

        /// Current asks: ask_id -> (collectionId, tokenId, quote_id, price, seller)
        asks: storage::HashMap<u128, (u64, u64, u64, Balance, AccountId)>,

        /// Ask index: helps find the ask by the colectionId + tokenId
        asks_by_token: storage::HashMap<(u64, u64), u128>,

        /// Last Ask ID
        last_ask_id: storage::Value<u128>,

        /////////////////////////////////////////////////////////////////////////////////
        // Trades

        /// Completed trades: trade_id -> (collectionId, tokenId, quote_id, price, seller, buyer)
        trades: storage::HashMap<u128, (u64, u64, u64, Balance, AccountId, AccountId)>,

        /// Last Trade ID
        last_trade_id: storage::Value<u128>,

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

            // Initialize last trade ID
            self.last_trade_id.set(0);

            // Set trade fee to 2%
            self.trade_fee_per_k.set(20);
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

            // Make sure the user has enough
            let initial_balance = self.balance_of_or_zero(quote_id, &self.env().caller());
            assert!(initial_balance >= withdraw_balance);

            // Update user's quote balance
            self.quote_balance.insert((quote_id, self.env().caller().clone()), initial_balance - withdraw_balance);

            // Increase last withdraw index
            self.last_withdraw_id.set(self.last_withdraw_id.get() + 1);

            // Start a withdraw from the vault
            self.withdraw_queue.insert(*self.last_withdraw_id.get(), (self.env().caller().clone(), withdraw_balance));
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

        /// Set the contract commission
        #[ink(message)]
        fn set_commission(&mut self, commission: u128) {
            self.ensure_only_owner();
            self.trade_fee_per_k.set(commission);
        }

        /// User: Tell the market about a pending NFT deposit
        // #[ink(message)]
        // fn request_nft_deposit(&mut self, collection_id: u64, token_id: u64) {
        //     self.last_nft_deposit_id.set(self.last_nft_deposit_id.get() + 1);
        //     self.nft_deposit_queue.insert(*self.last_nft_deposit_id.get(), (collection_id, token_id, self.env().caller().clone()));
        // }

        /// Admin: Tell the market about a successful NFT deposit
        #[ink(message)]
        fn register_nft_deposit(&mut self, collection_id: u64, token_id: u64, user: AccountId) {

            self.ensure_only_admin();

            // Record the token deposit for the user
            self.nft_deposits.insert((collection_id, token_id), user.clone());
        }

        /// Get deposit 
        #[ink(message)]
        fn get_nft_deposit(&mut self, collection_id: u64, token_id: u64) -> AccountId {
            *self.nft_deposits.get(&(collection_id, token_id)).unwrap()
        }

        /// Admin: Place a deposited NFT for sale
        #[ink(message)]
        fn ask(&mut self, collection_id: u64, token_id: u64, quote_id: u64, price: Balance) {

            // make sure sender owns this deposit
            let deposit_owner = *self.nft_deposits.get(&(collection_id, token_id)).unwrap();
            assert!(deposit_owner == self.env().caller());

            // Place an ask (into asks with a new Ask ID)
            let ask_id = self.last_ask_id.get() + 1;
            self.last_ask_id.set(ask_id);
            self.asks.insert(ask_id, (collection_id, token_id, quote_id, price, self.env().caller().clone()));

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
            let ask_id = (self.asks_by_token.get(&(collection_id, token_id)).unwrap()).clone();
            let (_, _, _, _, user) = (*self.asks.get(&ask_id).unwrap()).clone();
            assert!(user == self.env().caller().clone());

            // Remove the record that token is being sold by this user (from asks_by_token)
            let _ = self.asks_by_token.remove(&(collection_id, token_id));

            // Remove an ask (from asks)
            let _ = self.asks.remove(&ask_id);

            // Remove a deposit
            let _ = self.nft_deposits.remove(&(collection_id, token_id));

            // Transfer token back to user through NFT Vault
            self.last_nft_withdraw_id.set(self.last_nft_withdraw_id.get() + 1);
            self.nft_withdraw_queue.insert(*self.last_nft_withdraw_id.get(), (user, collection_id, token_id));
        }

        /// Match an ask
        #[ink(message)]
        fn buy(&mut self, collection_id: u64, token_id: u64) {

            // Get the ask
            let ask_id = (self.asks_by_token.get(&(collection_id, token_id)).unwrap()).clone();
            let (_, _, quote_id, price, seller) = (*self.asks.get(&ask_id).unwrap()).clone();

            // Check that buyer has enough balance
            let initial_buyer_balance = self.balance_of_or_zero(quote_id, &self.env().caller());
            assert!(initial_buyer_balance >= price);
            
            // Subtract balance from buyer and increase balance of the seller and owner (due to commission)
            let initial_seller_balance = self.balance_of_or_zero(quote_id, &seller);
            let initial_owner_balance = self.balance_of_or_zero(quote_id, &self.owner);
            assert!(initial_seller_balance + price > initial_seller_balance); // overflow protection
            self.quote_balance.insert((quote_id, self.env().caller().clone()), initial_buyer_balance - price);

            // Calculate fees. Division panics, so we can't use it and will hardcode to 2%. :((
            let mut fee = 0;
            if price > 100_000_000_000_000_000 {
                fee =    2_000_000_000_000_000;
            }
            else if price > 10_000_000_000_000_000 {
                fee =          200_000_000_000_000;
            }
            else if price > 1_000_000_000_000_000 {
                fee =          20_000_000_000_000;
            }
            else if price > 100_000_000_000_000 {
                fee =         2_000_000_000_000;
            }
            else if price > 10_000_000_000_000 {
                fee =          200_000_000_000;
            }
            else if price > 1_000_000_000_000 {
                fee =          20_000_000_000;
            }
            else if price > 100_000_000_000 {
                fee =         2_000_000_000;
            }
            else if price > 10_000_000_000 {
                fee =          200_000_000;
            }
            else if price > 1_000_000_000 {
                fee =          20_000_000;
            }
            self.trade_fee_per_k.get();
            let price_less_fee = price - fee;

            self.quote_balance.insert((quote_id, seller.clone()), initial_seller_balance + price_less_fee);
            self.quote_balance.insert((quote_id, self.owner.clone()), initial_owner_balance + fee);

            // Remove the record that token is being sold by this user (from asks_by_token)
            let _ = self.asks_by_token.remove(&(collection_id, token_id));

            // Remove an ask (from asks)
            let _ = self.asks.remove(&ask_id);

            // Remove a deposit
            let _ = self.nft_deposits.remove(&(collection_id, token_id));

            // Register the trade (actual transfers are made by the vault)
            // trade_id -> (collectionId, tokenId, quote_id, price, seller, buyer)
            self.last_trade_id.set(self.last_trade_id.get() + 1);
            self.trades.insert(*self.last_trade_id.get(), (collection_id, token_id, quote_id, price, seller.clone(), self.env().caller().clone()));

            // Start an NFT withdraw from the vault
            self.last_nft_withdraw_id.set(self.last_nft_withdraw_id.get() + 1);
            self.nft_withdraw_queue.insert(*self.last_nft_withdraw_id.get(), (self.env().caller().clone(), collection_id, token_id));
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
    }
}


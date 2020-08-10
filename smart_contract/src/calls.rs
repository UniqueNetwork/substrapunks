use crate::{AccountId, NodeRuntimeTypes};
use ink_core::env::EnvTypes;
use ink_prelude::vec::Vec;
use scale::{Codec, Decode, Encode};
use sp_runtime::traits::Member;

#[derive(Encode, Decode)]
#[cfg_attr(feature = "std", derive(Clone, PartialEq, Eq))]
pub enum Call {
    #[codec(index = "7")]
    Nft(Nft<NodeRuntimeTypes>),
}

impl From<Nft<NodeRuntimeTypes>> for Call {
    fn from(nft_call: Nft<NodeRuntimeTypes>) -> Call {
        Call::Nft(nft_call)
    }
}

#[derive(Encode, Decode, Debug, Eq, Clone, PartialEq)]
pub enum CollectionMode {
    Invalid,
    // custom data size
    NFT(u32),
    // decimal points
    Fungible(u32),
    // custom data size and decimal points
	ReFungible(u32, u32),
}

/// Generic Balance Call, could be used with other runtimes
#[derive(Encode, Decode, Clone, PartialEq, Eq)]
pub enum Nft<T>
where
    T: EnvTypes,
    T::AccountId: Member + Codec,
{
    #[allow(non_camel_case_types)]
    create_collection(Vec<u16>, Vec<u16>, Vec<u8>, CollectionMode),

    #[allow(non_camel_case_types)]
    destroy_collection(u64),

    #[allow(non_camel_case_types)]
    add_collection_admin(u64, T::AccountId),

    #[allow(non_camel_case_types)]
    remove_collection_admin(u64, T::AccountId),

    #[allow(non_camel_case_types)]
    change_collection_owner(u64, T::AccountId),

    #[allow(non_camel_case_types)]
    set_collection_sponsor(u64, T::AccountId),

    #[allow(non_camel_case_types)]
    confirm_sponsorship(u64),

    #[allow(non_camel_case_types)]
    remove_collection_sponsor(u64),

    #[allow(non_camel_case_types)]
    create_item(u64, Vec<u8>, T::AccountId),

    #[allow(non_camel_case_types)]
    burn_item(u64, u64),

    #[allow(non_camel_case_types)]
    transfer(T::AccountId, u64, u64, u64),

    #[allow(non_camel_case_types)]
    nft_approve(T::AccountId, u64, u64),

    #[allow(non_camel_case_types)]
    nft_transfer_from(T::AccountId, u64, u64, u64),

    #[allow(non_camel_case_types)]
    nft_safe_transfer(u64, u64, T::AccountId),

    #[allow(non_camel_case_types)]
    set_offchain_schema(u64, Vec<u8>),
}

pub fn transfer(collection_id: u64, item_id: u64, new_owner: AccountId) -> Call {
    Nft::<NodeRuntimeTypes>::transfer(new_owner.into(), collection_id, item_id, 0).into()
}


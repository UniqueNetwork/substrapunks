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

/// Generic Balance Call, could be used with other runtimes
#[derive(Encode, Decode, Clone, PartialEq, Eq)]
pub enum Nft<T>
where
    T: EnvTypes,
    T::AccountId: Member + Codec,
{
    #[allow(non_camel_case_types)]
    create_collection(Vec<u16>, Vec<u16>, Vec<u8>, u8, u32, u32),

    #[allow(non_camel_case_types)]
    destroy_collection(u64),

    #[allow(non_camel_case_types)]
    change_collection_owner(u64, T::AccountId),

    #[allow(non_camel_case_types)]
    add_collection_admin(u64, T::AccountId),

    #[allow(non_camel_case_types)]
    remove_collection_admin(u64, T::AccountId),

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
    approve(T::AccountId, u64, u64),

    #[allow(non_camel_case_types)]
    transfer_from(u64, u64, T::AccountId),

    #[allow(non_camel_case_types)]
    safe_transfer_from(u64, u64, T::AccountId),
}

pub fn transfer(collection_id: u64, item_id: u64, new_owner: AccountId) -> Call {
    Nft::<NodeRuntimeTypes>::transfer(new_owner.into(), collection_id, item_id, 0).into()
}


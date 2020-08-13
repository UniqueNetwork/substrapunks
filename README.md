# SubstraPunks

## Project Description
This is a Substrate based remake of CryptoPunks game, a classic game that inspired ERC-721 Ethereum standard.

10,000 unique character images were generated from a brand new set of face parts and put on IPFS network (can be accessed by this link at UseTech IPFS Gateway: [SubstraPunks - IPFS](https://ipfs-gateway.usetech.com/ipns/QmaMtDqE9nhMX9RQLTpaCboqg7bqkb6Gi67iCKMe8NDpCE/)) to prove that games and other applications that use our [NFT Chain](https://github.com/usetech-llc/nft_parachain) can be fully decentralized.

Each character has its set of features that is programmed into the NFT TestNet Blockchain. NFT Pallet stores details about each Punk whether it has Brown Beard, Orange Hair or smokes a Pipe, and the IPFS hosted web page retrieves these details from NFT Chain, so the game becomes completely 100% serverless.

Originally, like with CryptoPunks game, these characters can be claimed, but unlike CryptoPunks, claiming is done through an Ink! smart contract that initially owns all characters. When a user presses Claim button, a Polkadot{.js} extention is asked to sign the claim transaction and in 6 seconds the punk is yours! 

Finally, we exercised our new economic model. Even though claiming punks requires gas, the transfers are free. You can transfer the punk to some address with 0 balance, and then transfer it back without spenging any gas.

Please see the complete [Hackusama Walk-Through Guide](https://github.com/usetech-llc/nft_parachain/blob/master/doc/hackusama_walk_through.md) for demonstration of all features of Unique Network.

## Kusama Hackaphon Update

Before the Kusama Hackaphon the SubstraPunks game was using VueJS and backend for claiming punks, and was meant to be hosted. Hackaphon changes made this game completely decentralized, we replaced LarvaLabs images with our own, added smart contract claiming, and updated all pages.


## Claiming Punks

You need to have Polkadot{.js} extension installed. 

Navigate to a Punk that has no owner set and click "Claim" button on its page. Choose your Polkadot{.js} address, claim, and enjoy ownership!

## Hacking

### Pre-requisites

In order to run substrapunks for local development, you will need NodeJS 12 and a running [NFT Chain node](https://github.com/usetech-llc/nft_parachain). 

### Starting punks locally

Here is the game initialization process. 

`punk_collection.js` creates NFT collection and sets the admin address. 
`punk_importer.js` imports punks on-chain. 
`app.js` starts NodeJS Express application on port 3002.

```
npm install

cd scripts
node punk_collection.js
node punk_importer.js

cd ..
node app.js
```

### Legal Notice

Art and images included in this repository are the property of UseTech Professional.
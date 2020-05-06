# SubstraPunks
Substrate based remake of CryptoPunks game

## Running

1. You should have NFT chain node up and running. Configure Node address and Admin address in config.js file. For example for running locally:
```
const config = {
  wsEndpoint : 'ws://127.0.0.1:9944',
  collectionId : 1,

  adminAddress : 'XXXX',
  adminAccountPhrase : 'XXXX'
};
```

2. Run the scripts to import CryptoPunks into blockchain (you should have NodeJS 12 installed), this will take a while:
```
npm install
cd scripts
node punk_importer.js
```

3. Run the UI server:
```
node app.js
```

## Claiming Punks

Navigate to a Punk that has no owner set and click "Claim" button on its page. Enter your address, claim, and enjoy ownership!
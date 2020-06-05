# SubstraPunks
Substrate based remake of CryptoPunks game

## Running with Docker

1. You should have NFT chain node up and running. If you have the NFT node running at some other location than localhost, configure the node address in config.js file:
```
const config = {
  wsEndpoint : 'ws://127.0.0.1:9944',
  collectionId : 1,
  ...
};
```

2. Set number of punks that you would like to play with in config.js. The default number is 100, which takes about 30 minutes to import. The maximum number possible is 10,000:

```
const config = {
  ...
  punksToImport: 100,
  ...
};
```

3. Run the docker-compose and wait about 30 minutes:
```
docker-compose up
```

You will see output like this:
```
punks_1  | Alice address:  5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
punks_1  | === Transfer balance to admin ===
punks_1  | Alice balance:  1152921504606826720
punks_1  | Admin balance:  0
punks_1  | Current tx status is Ready
punks_1  | Current tx status is {"InBlock":"0x050195aa7255c46b873df890cad6549b3ca4d696f1a5d8ae5bca95fc5662c2e2"}
punks_1  | Transaction included at blockHash 0x050195aa7255c46b873df890cad6549b3ca4d696f1a5d8ae5bca95fc5662c2e2
punks_1  | Current tx status is {"Finalized":"0x050195aa7255c46b873df890cad6549b3ca4d696f1a5d8ae5bca95fc5662c2e2"}
punks_1  | Transaction finalized at blockHash 0x050195aa7255c46b873df890cad6549b3ca4d696f1a5d8ae5bca95fc5662c2e2
punks_1  | === Create collection ===
punks_1  | Collection already exists. Not creating.
punks_1  | === Set collection admin ===
punks_1  | Admin already exists. Not setting.
punks_1  | You are connected to chain Development using Substrate Node v2.0.0-alpha.6-bb1c5f7-x86_64-linux-gnu
punks_1  | Next collection ID: 1
punks_1  | Collection: {"Owner":"5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY","NextItemId":1,"CustomDataSize":10}
punks_1  | 0
punks_1  | 0 of 100 punks are already imported
punks_1  | === Importing Punk 1 of 100 ===
punks_1  | Current tx status is Ready
punks_1  | Current tx status is {"InBlock":"0x86840f372bb7b102959efbd0ce4718b5278a6c1b5d1479d63c104055882f7c55"}
punks_1  | Transaction included at blockHash 0x86840f372bb7b102959efbd0ce4718b5278a6c1b5d1479d63c104055882f7c55
punks_1  | Current tx status is {"Finalized":"0x86840f372bb7b102959efbd0ce4718b5278a6c1b5d1479d63c104055882f7c55"}
punks_1  | Transaction finalized at blockHash 0x86840f372bb7b102959efbd0ce4718b5278a6c1b5d1479d63c104055882f7c55
punks_1  | === Importing Punk 2 of 100 ===
punks_1  | Current tx status is Ready
...
```

4. In about 30 minutes output stops and you will see:
```
punks_1  | App listening on port 3001!
```

5. Open game in your browser: [https://localhost:3001](https://localhost:3001)

## Claiming Punks

Navigate to a Punk that has no owner set and click "Claim" button on its page. Enter your address, claim, and enjoy ownership!

For test, you can enter Bob's address: 5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty

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

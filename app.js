const bodyParser = require('body-parser')
const express = require('express');
const fs = require('fs');
const pngcrop = require('png-crop');
const pug = require('pug');
const session = require('express-session')
const config = require('./config');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');

const port = 3001;
const templatesFolder = "pages";
const imageFolder = "public/images";
const punksImage = "punks.png";

const app = express();
app.use( bodyParser.json() );
app.use(bodyParser.urlencoded({ extended: true })); 
app.use(session({
    secret: '34SDgsdgspxxxxxxxdfsG', // just a long random string
    resave: false,
    saveUninitialized: true
}));
app.use(express.static('public'));



/**
 * Serve punk images. Images are stored in one big 100x100 punks png file.
 * Use png-crop to generate.
 * 
 * Punk image size is 24x24 px
 */
app.get('/punks/:punkId', function (req, res) {
	const id = parseInt(req.params.punkId);
	const x = id % 100;
	const y = parseInt(id / 100);

	if (y <= 99) {
		var config2 = {top: y*24, left: x*24, width: 24, height: 24};
	
		var imgBuffer = fs.readFileSync(`${imageFolder}/${punksImage}`);
		pngcrop.cropToStream(imgBuffer, config2, function(err, outputStream) {
			if (err) throw err;
			outputStream.pipe(res);
		});
	} 
});

function getRandomInt(max) {
	return Math.floor(Math.random() * Math.floor(max));
}

app.get('/', function (req, res) {

	let rp = [];
	for (let i=0; i<12; i++) {
		rp.push(getRandomInt(config.punksToImport));
	}

	res.send(pug.compileFile(`${templatesFolder}/home.pug`)(
		{
			randomPunks: rp
		}
	));
});

app.get('/details/:punkId', function (req, res) {
	const id = parseInt(req.params.punkId);

	res.send(pug.compileFile(`${templatesFolder}/details.pug`)(
		{
			punkId: id,
			endpoint: config.wsEndpoint,
			collectionId: config.collectionId,
			adminAddr: config.adminAddress,
		}
	));
});

function transferAsync(punkId, newOwner) {
	return new Promise(async function(resolve, reject) {

	  try {
		// Initialise the provider to connect to the node
		const wsProvider = new WsProvider(config.wsEndpoint);
		
		// Create the API and wait until ready
		const api = await ApiPromise.create({ 
			provider: wsProvider,
			types: {
				NftItemType: {
				  Collection: "u64",
				  Owner: "AccountId",
				  Data: "Vec<u8>"
				},
				CollectionType: {
				  Owner: "AccountId",
				  NextItemId: "u64",
				  CustomDataSize: "u32"
				},
				Address: "AccountId",
				LookupSource: "AccountId",
				Weight: "u32"
			  }
		  });

		// Import admin account from mnemonic phrase in config file
		const keyring = new Keyring({ type: 'sr25519' });
		const admin = keyring.addFromUri(config.adminAccountPhrase);
		
		// Need to use punkId+1 to map between original punk IDs and NDT module punk IDs, which start from 1.
		const unsub = await api.tx.nft
			.transfer(config.collectionId, punkId+1, newOwner)
			.signAndSend(admin, (result) => {
			console.log(`Current tx status is ${result.status}`);
		
			if (result.status.isInBlock) {
				console.log(`Transaction included at blockHash ${result.status.asInBlock}`);
			} else if (result.status.isFinalized) {
				console.log(`Transaction finalized at blockHash ${result.status.asFinalized}`);
				resolve();
				unsub();
			}
			});
	  } catch (e) {
		  reject();
	  }

	});
  }
  
app.get('/claim/:punkId/:newOwner', async function (req, res) {
	console.log(`${req.params.newOwner} is claiming punk ${req.params.punkId}`);

	try {
		await transferAsync(parseInt(req.params.punkId), req.params.newOwner);
		res.send("OK");
	} catch (e) {
		res.status(500).send('error');
	}
});

app.listen(port, () => console.log(`App listening on port ${port}!`));

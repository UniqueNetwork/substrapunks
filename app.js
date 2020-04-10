const bodyParser = require('body-parser')
const express = require('express');
const fs = require('fs');
const pngcrop = require('png-crop');
const pug = require('pug');
const session = require('express-session')

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
		rp.push(getRandomInt(10000));
	}

	res.send(pug.compileFile(`${templatesFolder}/home.pug`)(
		{
			randomPunks: rp
		}
	));
});

app.get('/details/:punkId', function (req, res) {
	const id = parseInt(req.params.punkId);
	const gender = "Gender unknown";
	const pronoun = "her";
	let accessories = ["Tassle Hat", "Hot Lipstick", "Earring"];
	const ownerAddress = "ASDLKJHFADLKJSALKJH";

	res.send(pug.compileFile(`${templatesFolder}/details.pug`)(
		{
			punkId: id,
			gender: gender, 
			accessories: accessories,
			ownerAddress: ownerAddress,
			pronoun: pronoun,
			owned: false
		}
	));

});

app.get('/claim/:punkId', function (req, res) {
	
});

app.listen(port, () => console.log(`App listening on port ${port}!`));

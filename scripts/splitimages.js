const fs = require('fs');
const pngcrop = require('png-crop');
var BigNumber = require('bignumber.js');
BigNumber.config({ DECIMAL_PLACES: 18, ROUNDING_MODE: BigNumber.ROUND_DOWN });

const imageFolder = "../public/images";
const punksImage = "punks.png";
const outputFolder = "../public/images/punks";

function getImage(id, imgBuffer) {
    return new Promise(async function(resolve, reject) {
        const x = id % 100;
        const y = parseInt(id / 100);
    
        if (y <= 99) {
            var config2 = {top: y*24, left: x*24, width: 24, height: 24};
    
            pngcrop.crop(imgBuffer, `${outputFolder}/punk${id}.png`, config2, function(err) {
                if (err) reject();
                console.log(`Punk ${id} image saved`);
                resolve();
            });
        } 
    });
}


async function main() {
    var imgBuffer = fs.readFileSync(`${imageFolder}/${punksImage}`);
    for (let i=0; i<1000; i++)
        await getImage(i, imgBuffer);
}

main().catch(console.error).finally(() => process.exit());

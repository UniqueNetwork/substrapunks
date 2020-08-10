const fs = require("fs");
const mergeImg = require('merge-img');

const outputFolder = "./generated_faces";
const outputCharacterJSON = "./generated_faces/characters.json";
const outputAttributesJS = "./generated_faces/attributes.json";

const desiredCount = 10000;
const totalFaces = 89820;

// const ext = ".png";
// const partFolder = "./test_face_parts";
// const partTypes = [
//   { name: "head",  count: 1, offset: {x:    0, y: 0}, attrNames: [""], required: true },
//   { name: "nose",  count: 2, offset: {x: -100, y: 0}, attrNames: ["Normal nose", "Potato nose"], required: false },
//   { name: "eyes",  count: 2, offset: {x: -100, y: 0}, attrNames: ["Normal eyes", "Crazy eyes"], required: true },
//   { name: "hair",  count: 2, offset: {x: -100, y: 0}, attrNames: ["Blonde hair", "Dark hair"], required: true },
//   { name: "mouth", count: 3, offset: {x: -100, y: 0}, attrNames: ["Red mouth", "Black mouth", "Blue mouth"], required: true },
// ];

const ext = ".png";
const partFolder = "./face_parts";
const partTypes = [
  { name: "face/face",   count: 2,  offset: {x:    0, y: 0}, attrNames: ["", ""], attrSex: ["u", "u"], required: true },
  { name: "mouth/m",     count: 6,  offset: {x: -560, y: 0}, attrNames: ["Black Lipstick", "Red Lipstick", "Smile", "", "Teeth Smile", "Purple Lipstick"], attrSex: ["f", "f", "u", "u", "m", "f"], required: true },
  { name: "nose/n",      count: 2,  offset: {x: -560, y: 0}, attrNames: ["", "Nose Ring"], attrSex: ["u", "u"], required: true },
  { name: "eyes/eyes",   count: 5,  offset: {x: -560, y: 0}, attrNames: ["", "Asian Eyes", "Sun Glasses", "Red Glasses", "Round Eyes"], attrSex: ["u", "u", "u", "u", "u"], required: true },
  { name: "ears/ears",   count: 4,  offset: {x: -560, y: 0}, attrNames: ["", "Left Earring", "Right Earring", "Two Earrings"], attrSex: ["u", "u", "u", "u"], required: true },
  { name: "beard/beard", count: 8,  offset: {x: -560, y: 0}, attrNames: ["Brown Beard", "", "Mustache-Beard", "", "Mustache", "", "Regular Beard", ""], attrSex: ["m", "u", "m", "u", "m", "u", "m", "u"], required: false },
  { name: "hair/hair",   count: 12, offset: {x: -560, y: 0}, attrNames: ["Up Hair", "Down Hair", "Mahawk", "Red Mahawk", "Orange Hair", "Bubble Hair", "Emo Hair", "Thin Hair", "Bald", "Blonde Hair", "Caret Hair", "Pony Tails"], attrSex: ["m", "u", "u", "u", "u", "m", "u", "m", "m", "f", "f", "f"], required: true },
  { name: "access/acc",  count: 2,  offset: {x: -560, y: 0}, attrNames: ["Cigar", "Pipe"], attrSex: ["u", "u"], required: false },
];

function checkAttributeCompatibility(codeArr) {

  let blondeHair = false;
  let earring = false;
  for (let i=0; i<partTypes.length; i++) {
    if ((partTypes[i].name == "hair/hair") && (codeArr[i] == 10))
      blondeHair = true;
    if ((partTypes[i].name == "ears/ears") && (codeArr[i] >= 2))
      earring = true;
  }

  if (earring && blondeHair) return false;
  return true;
}

function mergeImagesToPng(images, output) {
  return new Promise(function(resolve, reject) {
    mergeImg(images)
    .then((img) => {
      // Save image as file
      img.write(output, () => {
        console.log(`Image ${output} saved`);
        resolve();
      });
    });
    // resolve();
  });
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function detectGender(codeArr) {
  let male = false;
  let female = false;
  for (let i=0; i < partTypes.length; i++) {
    if (codeArr[i] != 0) {
      const attrGender = partTypes[i].attrSex[codeArr[i]-1];
      if (attrGender == "m") male = true;
      if (attrGender == "f") female = true;
    }
  }

  if (male && female) return "Invalid";
  if (male) return "Male";
  if (female) return "Female";

  if (getRandomInt(100) > 50) return "Female";
  else return "Male";
}

async function saveFaceByCode(codeArr, outFile) {
  let images = [];
  for (let i=0; i < partTypes.length; i++) {
    if (codeArr[i] != 0) {
      const img = {
        src: `${partFolder}/${partTypes[i].name}${codeArr[i]}${ext}`,
        offsetX: partTypes[i].offset.x,
        offsetY: partTypes[i].offset.y,
      }
      images.push(img);
    }
  }

  // Generate image
  await mergeImagesToPng(images, outFile);
}


async function generateFaces() {

  // Array that lists all characters
  let characters = [];

  // Save attributes and generate map of attributes to saved array index
  let attrArray = [];
  let attrMap = {};
  let attrFreq = {};
  let attrCount = 0;
  for (let i=0; i < partTypes.length; i++) {
    for (let j=1; j<=partTypes[i].count; j++) {
      if (partTypes[i].attrNames[j-1].length > 0) {
        attrArray.push(partTypes[i].attrNames[j-1]);
        attrMap[partTypes[i].attrNames[j-1]] = attrCount;
        attrFreq[partTypes[i].attrNames[j-1]] = 0;
        attrCount++;
      }
    }
  }
  let attrjs = `const attributes = ${JSON.stringify(attrArray)};`;
  attrjs += "\n\nmodule.exports.attributes = attributes;";
  fs.writeFileSync(outputAttributesJS, attrjs);

  // "Code array" contains the code of current "face"
  // Initialize it to the first "face"
  let codeArr = [];
  for (let i=0; i < partTypes.length; i++) {
    if (partTypes[i].required) 
      codeArr.push(1);
    else
      codeArr.push(0);
  }
  let imgCount = 0;

  // In the loop generate faces and increase the code by one
  let exhausted = false;
  while (!exhausted) {
    // Check if combination is valid
    let gender = detectGender(codeArr);
    let valid = checkAttributeCompatibility(codeArr);

    // Skip faces randomly to get close to desired count
    const r = (getRandomInt(1000)+1)/1200;
    // const r = 0;
    if ((r <= desiredCount/totalFaces) && (gender != "Invalid") && (valid)) {
      // Generate and save current face
      await saveFaceByCode(codeArr, `${outputFolder}/image${imgCount}${ext}`);

      // Add character with accessories
      c = {
        id: imgCount,
        gender: gender,
        attributes: []
      };
      for (let i=0; i < partTypes.length; i++) {
        if (partTypes[i].attrNames.length != 0)
          if (codeArr[i] != 0) {
            let attrName = partTypes[i].attrNames[codeArr[i]-1];
            if (attrName.length > 0) {
              c.attributes.push(attrMap[attrName]);
              attrFreq[attrName]++;
            }
          }
      }
      characters.push(c);

      imgCount++;
    } else {
      // console.log(`Skipping. r = ${r}, gender = ${gender}, codeArr=${codeArr}`);
    }

    // Increate code by 1
    let canIncrease = false;
    for (let i=0; i < partTypes.length; i++) {
      if (codeArr[i] < partTypes[i].count) {
        canIncrease = true;
        codeArr[i]++;
        for (let j=i-1; j>=0; j--) {
          if (partTypes[j].required)
            codeArr[j] = 1;
          else
            codeArr[j] = 0;
        }
        break;
      }
    }
    if (!canIncrease) exhausted = true;
    if (imgCount == desiredCount) break;
  }

  // Save characters' JSON
  fs.writeFileSync(outputCharacterJSON, JSON.stringify(characters));

  console.log("Total generated characters: ", imgCount);
  console.log("Attribute frequencies: ", attrFreq);
}

async function generateManually() {

  // Женин любимый
  code = [1, 5, 2, 3, 1, 1, 5, 1];
  await saveFaceByCode(code, "test.png");

  let punks = require("./generated_faces/characters.json");
  c = {
    id: 10000,
    gender: "Male",
    attributes: [3,7,13,21,29]
  };
  punks.push(c);
  fs.writeFileSync("characters.json", JSON.stringify(punks));
}

async function main() {
  await generateFaces();
  // await generateManually();
}

main();

// function test() {
//   code = [1, 6, 2, 4, 4, 1, 8, 1];
//   console.log(detectGender(code));
// }
// test();
const config = {
  wsEndpoint : process.env.wsEndpoint || 'ws://127.0.0.1:9944',
  //wsEndpoint : 'wss://wsnft.usetech.com',
  collectionId : 1,
  collectionDataSize: 10,
  punksToImport: 1000,

  aliceSeed : '//Alice',
  adminAddress : '5EX7TXyGRD5z2gLVc2yRAFY6pym2HHhMVCb3Zj3ai3x6BUnd',
  adminAccountPhrase : 'paper gas baby grid above unusual dog roof option spirit step damage',

  contractAddr : "5F49rh2SfZiu13Jm6DgU4ZrG4W51mEWwHA4gf9JkCCGi3fy3"
};

module.exports = config;
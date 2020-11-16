const { ApiPromise, WsProvider, Keyring } = require('api_v1');
const { Abi, PromiseContract } = require('api_contracts');
const delay = require('delay');
const config = require('./config');
const fs = require('fs');

const rtt = require("./runtime_types.json");
const contractAbi = require("./market_metadata.json");

const blackList = [ 7395, 1745, 8587, 573, 4732, 3248, 6986, 7202, 6079, 1732, 6494, 7553, 6840, 4541, 2102, 3503, 6560, 4269, 2659, 3912, 3470, 6290, 5811, 5209, 8322, 1813, 7771, 2578, 2661, 2983, 2119, 3310, 1547, 1740, 3187, 8194, 4651, 6188, 2167, 3487, 3106, 6070, 3446, 2407, 5870, 3745, 6389, 3246, 9385, 9680, 6457, 8462, 2350, 3927, 2269, 8485, 6198, 6787, 2047, 2197, 2379, 2466, 2558, 2682, 2759, 2979, 4232, 4273, 8187, 8190, 2935, 2673, 5228, 7683, 2075, 9845, 1645, 3198, 7490, 3192, 7907, 3167, 858, 239, 7613, 2790, 7043, 5536, 8277, 1134, 6378, 2416, 2373, 2240, 3952, 5017, 4999, 5986, 3159, 6155, 9329, 6445, 2117, 3935, 6091, 7841, 8725, 5194, 5744, 8120, 5930, 578, 6171, 6930, 2180, 6212, 5963, 7097, 8774, 5233, 7978, 2938, 2364, 1823, 1840, 8672, 5616, 737, 6122, 8769, 615, 9729, 3489, 427, 9883, 8678, 6579, 1776, 7061, 873, 5324, 2390, 6187, 9517, 2321, 3390, 3180, 6692, 2129, 9854, 1572, 7412, 3966, 1302, 1145, 1067, 3519, 7387, 8314, 648, 219, 2055, 825, 1195
];

// const returns = 
// {
//   '5Fj7qQR7f9uMNXTgj6bBJDKbaHbEnVb7c3tb881kchbDd82V': [],
//   '5EgtXK8zsxUu47Zg1ASZF7KzNtWowk6Grp9qEFeVC6C5vgDU': [
//     '5635', '2820', '2697',
//     '9452', '1649', '1627',
//     '824',  '2812', '1184',
//     '5204', '3717', '5405',
//     '6318'
//   ],
//   '5E5Fn3wSauxshGEAV8WuBkZBNVchzqQjodJ2q5cmBASurM45': [
//     '6966', '4445',
//     '2949', '9242',
//     '5808', '6797',
//     '6548', '7237'
//   ],
//   '5Gx5Xj6JDmgLzDzwPwLecgDUJVoH3Hpn6YpJ4UwtHL4Lffgo': [
//     '1822', '6867', '2507', '9400', '3273', '2898',
//     '4896', '4251', '8351', '5203', '5341', '8463',
//     '8438', '6055', 
//     '6101', '7525', '874',  '4241',
//     '2513', '4626', '2267', '4347', '4225', '8410',
//     '5727', '2581', '8486', '4519', '845',  '8719',
//     '7579', '6832', '2067', '8521', '5504', '4870',
//     '4562', '6098', '7954', '5649', '9024', '2710',
//     '3118', '4332', '4435', '8098', '8681', '5147',
//     '8444', '6616', '6878', '4628', '4482', '7926',
//     '6957', '5474', '8836', '4983', '7153', '4930',
//     '7290', '9319', '8697', '7725', '6895', '4021',
//     '1860', '9293', '9528', '9796', '6619', '6896',
//     '2762', '7382', '6856', '1390', '8950', '1846',
//     '1142'
//   ],
//   '5GbrTYbpLNanZ9c3TjkAURAT91VchpTtE82Vy2mgiex8gqTt': [ '4970' ],
//   '5GedyoC1nULnjzk3m8qjZznsAtpnJPUQREVLDcXcgD1yLwrb': [ '475' ],
//   '5CFreprkmVXhuJMq71UZVp3ezMGJqY9C55XgiRtaraw8yksp': [
//     '6001', '2840',
//     '5421', '6400',
//     '3728', '4897',
//     '4696', '7823',
//     '6176'
//   ],
//   '5F4mm8v3xB9LvXHaCbULezYC7avkJKqVZgKzh782wqJbfiBe': [
//     '9567', '9152', '9192',
//     '7422', '1944', '5325',
//     '7632', '9453', '4289',
//     '8670', '7389', '4973',
//     '5442', '9380', '6935',
//     '9814'
//   ],
//   '5H5vt1ZCpGauEeiTVV6bWgaFh1VKXGf3kh4qGaLxarppVw7W': [
//     '9154', '8634',
//     '5765', '4304',
//     '9184', '2902',
//     '5330', '5676'
//   ],
//   '5DRcSAzqtaUPXx1oQsEJMN8Y2DTTnCRgDcw2Gyq395av7EDm': [ '1223' ],
//   '5EHqNbHXAJukreMcAKCZDNTrRGLoPFb6cT7UdiTbD8LQph7N': [ '5959', '8181', '6285' ],
//   '5EByTjfz31wtTPab5FXpjbxcb9qK4iXWTPqzo134aQm5QauZ': [
//     '9054', '1247', '9574', '8934',
//     '1125', '9158', '2683', '9458',
//     '8807', '2330', '9953', '8641',
//     '6453', '6014', '6334', '4362',
//     '2480', '5133', '7691', '5573',
//     '9623', '8665', '5337', '6012',
//     '8669', '6036', '8943', '9584',
//     '6512'
//   ],
//   '5Gdj9n5idJwTjJY5f2QWmrfu5yS57SGGEJt5rsw9UoLuRbYo': [
//     '4789', '4866', '4520', '4209', '7420', '7671',
//     '7656', '7654', '7645', '7643', '7642', '7636',
//     '4256', '4214', '4212', '4205', '7296', '2992',
//     '7507', '7607', '733',  '687',  '854',  '1626',
//     '3579', '5872', '4432', '3791', '4170', '1654',
//     '8691', '6274', '5097', '2595', '2611', '617',
//     '5025', '3799', '1491', '3084', '7639', '5718',
//     '7655', '6520', '4563', '7411', '3894', '5281',
//     '4306', '3209', '2208', '2735', '5087', '4223',
//     '5603', '1680', '3666', '3660', '7651', '7650',
//     '7649', '7648', '7641', '7640', '7635', '4211',
//     '4204', '2752', '6047', '6057'
//   ],
//   '5FF7F1eDV59gH1yzamUuhzWkjwf96gZDWDK7tCUDehDuKfQk': [
//     '5385', '8070', '1981', '3858',
//     '4700', '5894', '7996', '9383',
//     '5060', '508',  '5878', '1910',
//     '8060', '445',  '8575', '4342',
//     '3303', '7757', '4193', '1515',
//     '5359', '4244', '4353', '2624',
//     '7758', '1535', '8581', '5998',
//     '9115', '6818', '5356'
//   ],
//   '5CqULFyV8rgpy3bd3yJGfyFoPrn2EP46vnn86ey4FP5j4nih': [
//     '9278', '6726', '4185', '9776', '1485', '7002',
//     '2655', '1544', '9926', '8644', '3306', '2316',
//     '5799', '7095', '8963', '6747', '869',  '4792',
//     '5161', '2541', '5587', '8993', '1143', '5528',
//     '1424', '5438', '8353', '6180', '8125', '8417',
//     '2561', '2827', '6525', '1833', '1541', '9014',
//     '6772', '5965', '5411', '5816', '9606', '1086',
//     '2641', '8624', '3967', '882',  '5265', '8321',
//     '3760', '2437', '8134', '1613', '8435', '1867',
//     '4392', '945',  '8562', '7265', '8254', '6842',
//     '8278', '5910', '8048', '1288', '4972', '1197'
//   ],
//   '5CZnrJuy9iEYpcSUucTGzzmWvPj9hEicgBxXF3RFTooRXBRa': [ '7065', '2342', '9763', '2560', '3025', '8176' ],
//   '5FBuB6nFppMZoc3ZU7jkFKpPT1w7q49oBZDxEWSsY9RJkH9M': [
//     '6398', '2604', '2597',
//     '5737', '2230', '3269',
//     '6933', '1467', '5934',
//     '4772', '5640', '6028',
//     '2289', '1227', '2577',
//     '2186', '2368', '7803',
//     '7390', '5733', '806',
//     '7363', '3776'
//   ],
//   '5Dqd5PVoTWYzpJzkbtXb6RFF2E6ZLoMszaSrDK7MFedLEo4R': [
//     '8354', '4131', '9756', '6602', '2750', '9943',
//     '3651', '3960', '2686', '8432', '2532', '7273',
//     '6209', '9100', '1170', '6704', '1404', '5085',
//     '8184', '3734', '4915', '1723', '2886', '8090',
//     '2995', '9614', '8695', '9396', '1387', '9303',
//     '9234', '7795', '5582', '4506', '424',  '2545',
//     '9750', '9195', '9102', '4104', '8727', '4451',
//     '8709', '7848', '9658', '6515', '5329', '8520',
//     '3920', '1956', '3085', '8703', '8571', '8975',
//     '4311', '2843', '8846', '1139', '7001', '8831',
//     '6884', '1098', '8385', '8825'
//   ],
//   '5GKGS1jtBaYPKYESU6RRtfNqMozMMFtcABAqx34MjxGbzThD': [ '85', '1907' ],
//   '5EFsRhyYkmvGxN9L3Yr1DBqqTrnjMg1SNxFWpwZTrTA1vKe7': [
//     '1611', '488',  '1064',
//     '6902', '9663', '8604',
//     '5010', '302',  '446',
//     '5013', '7271', '9298',
//     '7843', '1695', '2586',
//     '3097', '4315'
//   ],
//   '5ES3TzjxnmRvHDrq3hHkWi6RMmTqE29rvWDtQp8mePPnYqu6': [ '91', '4125', '2472' ],
//   '5GgdYwYJvhm2FzXvMzbvU8CQkpVNT7rWfibQACLVihp9w8b6': [ '9593' ],
//   '5H92NmUsAvVRpc6UC38SnU2RDX1fMyxAxzLL65uvqAFBynkH': [
//     '1295', '5671',
//     '1529', '9463',
//     '5224', '5648',
//     '633',  '8289'
//   ],
//   '5EkXEhwa1J4aJdkAm4aAYVzS88P5Etvor57qtSe4Mtfx1WWJ': [ '800' ],
//   '5DsduK2z4pUAvtaBWqoBeTJyuteem8qymoTgLYitr8DGpDjo': [ '3525' ],
//   '5CcCsrbrZQJCNKoHb1kCHZZ96CUJuAuuf4fC2xc8RAuBm5RD': [ '7037' ],
//   '5DWkKJa3gf3tijad1C4dcCA2ZCefkRtxPiYWUGZzcQva6XB1': [ '6701' ],
//   '5Cym6kpA56vJmPqwsBovQDaVY76ET9zdmwELXcZW1uByxGKD': [ '1292', '9765', '345', '148' ],
//   '5FqF5439yKUr6wFfaHT2rrRMwJ2o172gDGpazTdXR7guGZM9': [],
//   '5Cako4LxR6hsYZAa3S7Tx5gymxdyq7RrY3pFR7WYNF8E3kGZ': [
//     '9087', '3012',
//     '4685', '8720',
//     '6483', '7919',
//     '9551', '2714',
//     '6294'
//   ]
// };


const returns = {
  '5Gx5Xj6JDmgLzDzwPwLecgDUJVoH3Hpn6YpJ4UwtHL4Lffgo': [9720, 5016, 3107, 4798, 8252, 6093, 5453, 8906],
  '5D73wtH5pqN99auP4b6KQRQAbketaSj4StkBJxACPBUAUdiq': [9688],
  '5CFreprkmVXhuJMq71UZVp3ezMGJqY9C55XgiRtaraw8yksp': [3131, 2550, 5724, 8112, 3890, 1970, 7713],
  '5F4mm8v3xB9LvXHaCbULezYC7avkJKqVZgKzh782wqJbfiBe': [6809, 1466],
  '5EHqNbHXAJukreMcAKCZDNTrRGLoPFb6cT7UdiTbD8LQph7N': [6607],
  '5CZnrJuy9iEYpcSUucTGzzmWvPj9hEicgBxXF3RFTooRXBRa': [4178],
  '5FF7F1eDV59gH1yzamUuhzWkjwf96gZDWDK7tCUDehDuKfQk': [1451],

};


async function getUniqueConnection() {
  // Initialise the provider to connect to the node
  const wsProviderNft = new WsProvider(config.wsEndpointNft);

  // Create the API and wait until ready
  const api = new ApiPromise({ 
    provider: wsProviderNft,
    types: rtt
  });

  api.on('disconnected', async (value) => {
    log(`disconnected: ${value}`);
    process.exit();
  });
  api.on('error', async (value) => {
    log(`error: ${value.toString()}`);
    process.exit();
  });

  await api.isReady;

  return api;
}

function sendTransactionAsync(api, sender, transaction) {
  return new Promise(async function(resolve, reject) {

    try {
      const unsub = await transaction
        .signAndSend(sender, ({ events = [], status }) => {
      
        if (status == 'Ready') {
          // nothing to do
          console.log(`Current tx status is Ready`);
        }
        else if (JSON.parse(status).Broadcast) {
          // nothing to do
          console.log(`Current tx status is Broadcast`);
        }
        else if (status.isInBlock) {
          console.log(`Transaction included at blockHash ${status.asInBlock}`);
          resolve();
          unsub();
        } else if (status.isFinalized) {
          console.log(`Transaction finalized at blockHash ${status.asFinalized}`);

          // Loop through Vec<EventRecord> to display all events
          let success = false;
          events.forEach(({ phase, event: { data, method, section } }) => {
            console.log(`\t' ${phase}: ${section}.${method}:: ${data}`);
            if (method == 'ExtrinsicSuccess') {
              console.log(`Transaction`, `Successful`);
              success = true;
            }
          });

          if (success) resolve();
          else {
            reject();
            console.log(`Transaction`, `FAILED`);
          }
          unsub();
        }
        else //if (status.isUsurped) 
        {
          console.log(`Something went wrong with transaction. Status: ${status}`);

          reject();
          unsub();
        }
      });
    } catch (e) {
      console.log("Error: ", e);
      reject(e);
    }
  });

}

async function sendNftTxAsync(api, sender, recipient, collection_id, token_id) {
  const tx = api.tx.nft
    .transfer(recipient, collection_id, token_id, 0);
  await sendTransactionAsync(api, sender, tx);
}


async function main() {

  const api = await getUniqueConnection();
  const keyring = new Keyring({ type: 'sr25519' });
  const admin = keyring.addFromUri(config.adminSeed);

  let count = 0;
  for (let address in returns) {
    console.log(address);
    for (let i=0; i<returns[address].length; i++) {
      console.log(`Returning ${returns[address][i]} to ${address}`);
      count++;

      await sendNftTxAsync(api, admin, address, 4, returns[address][i]);

      // if (blackList.includes(returns[address][i]))
      //   console.log("BLACKLISTED: ", returns[address][i]);
    }
  }

  console.log(count);
}

main().catch(console.error).finally(() => process.exit());

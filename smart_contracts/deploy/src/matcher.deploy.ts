import chai from "chai";
import chaiAsPromised from 'chai-as-promised';
import { ApiPromise, Keyring } from "@polkadot/api";
import { IKeyringPair } from '@polkadot/types/types';
import usingApi from "./substrate/substrate-api";
import fs from "fs";
import { Abi, BlueprintPromise as Blueprint, CodePromise, ContractPromise as Contract } from "@polkadot/api-contract";

chai.use(chaiAsPromised);
const expect = chai.expect;

const gasLimit = '200000000000';
const endowment = '100000000000000000';

function deployBlueprint(alice: IKeyringPair, code: CodePromise): Promise<Blueprint> {
  return new Promise<Blueprint>(async (resolve, reject) => {
    const unsub = await code.createBlueprint()
      .signAndSend(alice, (result) => {
        if (result.status.isInBlock || result.status.isFinalized) {
          // here we have an additional field in the result, containing the blueprint
          resolve(result.blueprint);
          unsub();
        }
      })
  });
}

function instantiateContract(alice: IKeyringPair, blueprint: Blueprint) : Promise<any> {
  return new Promise<any>(async (resolve, reject) => {
    const unsub = await blueprint.tx
    .new(endowment, gasLimit)
    .signAndSend(alice, (result) => {
      if (result.status.isInBlock || result.status.isFinalized) {
        unsub();
        resolve(result);
      }
    });    
  });
}

async function deployMatcherContract(api: ApiPromise): Promise<Contract> {
  const metadata = JSON.parse(fs.readFileSync('../market/target/metadata.json').toString('utf-8'));
  const abi = new Abi(metadata);
  console.log('metadata ready');

  const keyring = new Keyring({ type: 'sr25519' });
  const deployer = keyring.addFromUri(`//Alice`);

  const wasm = fs.readFileSync('../market/target/matcher.wasm');
  console.log('wasm ready');

  const code = new CodePromise(api, abi, wasm);
  console.log('code ready');

  const blueprint = await deployBlueprint(deployer, code);
  console.log('blueprint ready');
  const contract = (await instantiateContract(deployer, blueprint))['contract'] as Contract;
  console.log('contract ready', contract);
  return contract;
}



describe('Contracts', () => {

  it('Deploy matcher smart contract', async () => {
    await usingApi(async api => {
      console.log('api ready');

      const contract = await deployMatcherContract(api);
      console.log("Contract address: ", contract.address.toString());
      
      // expect(result.success).to.be.true;
      // expect(tokenBefore.Owner.toString()).to.be.equal(alice.address);
      // expect(tokenAfter.Owner.toString()).to.be.equal(bob.address);
    });
  });
});

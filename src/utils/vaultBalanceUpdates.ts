import { Address, BigInt, Bytes, ethereum as eth, ethereum } from '@graphprotocol/graph-ts';

import { 
    Transfer, 
    VaultUpdate, 
    Vault,
    Transaction,
    Deposit,
    Withdrawal
} from '../../generated/schema';

import {
    buildId,
    buildUpdateId
} from './commons';

import { getOrCreateAccount } from './account';
import { getOrCreateVault } from './vault';
import { getOrCreateToken } from './token';
import { BIGINT_ZERO, DEFAULT_DECIMALS } from '../utils/constants';

export function createVaultUpdate(
    transaction: Transaction,
    vault: Vault,
    timestamp: BigInt,
    blockNumber: BigInt,
    deposits: BigInt,
    withdrawals: BigInt, // withdrawal doesn't change
    sharesMinted: BigInt,
    sharesBurnt: BigInt, // shares burnt don't change
    // pricePerFullShare: BigInt,
  ): VaultUpdate {
    let vaultUpdateId = buildUpdateId(
      Address.fromString(vault.id),
      transaction.hash,
      transaction.index,
    )
    let vaultUpdate = new VaultUpdate(vaultUpdateId);
  
    vaultUpdate.timestamp = timestamp;
    vaultUpdate.blockNumber = blockNumber;
  
    // TODO: refactor to new schema
    // vaultUpdate.balance = deposits.minus(withdrawals);
    // vaultUpdate.deposits = deposits;
    // vaultUpdate.withdrawals = withdrawals;
  
    // vaultUpdate.shareBalance = sharesMinted.minus(sharesBurnt);
    // vaultUpdate.sharesMinted = sharesMinted;
    // vaultUpdate.sharesBurnt = sharesBurnt;
    // NOTE: don't update vaultUpdate.sharesBurnt
  
    vaultUpdate.vault = vault.id;
    // TODO: refactor this to new schema
    // vaultUpdate.pricePerFullShare = pricePerFullShare;
  
    // let vaultUpdates = vault.vaultUpdates;
    // if (vaultUpdates.length > 0) {
    //   let previousVaultUpdate = VaultUpdate.load(vaultUpdates[vaultUpdates.length - 1]);
  
    //   // TODO: add update algorithm
    //   vaultUpdate.withdrawalFees = previousVaultUpdate.withdrawalFees;
    //   vaultUpdate.performanceFees = previousVaultUpdate.performanceFees;
    //   vaultUpdate.earnings = vaultUpdate.withdrawalFees.plus(vaultUpdate.performanceFees);
    // } else {
    //   vaultUpdate.withdrawalFees = BIGINT_ZERO;
    //   vaultUpdate.performanceFees = BIGINT_ZERO;
    //   vaultUpdate.earnings = BIGINT_ZERO;
    // }
  
    // vaultUpdates.push(vaultUpdate.id);
    // vault.vaultUpdates = vaultUpdates;
  
    // vaultUpdate.save();
    vault.save();
  
    return vaultUpdate as VaultUpdate;
  }

  export function internalMapDeposit(
    transaction: Transaction,
    to: Address,
    from: Address,
    inputAmount: BigInt,
    totalAssets: BigInt,
    totalSupply: BigInt,
    // pricePerShare: BigInt,
    blockTimestamp: BigInt,
    blockNumber: BigInt,
  ): void {
    let id = buildId(transaction.hash, transaction.index);
    let vaultAddress = to;
  
    let account = getOrCreateAccount(from);
    let vault = getOrCreateVault(vaultAddress, false);
  
    let shares = totalAssets.equals(BIGINT_ZERO)
      ? inputAmount
      : inputAmount.times(totalSupply).div(totalAssets);
  
    let vaultUpdate = createVaultUpdate(
      transaction,
      vault,
      blockTimestamp,
      blockNumber,
      // call.inputs._amount, // don't pass
      inputAmount,
      BIGINT_ZERO, // withdrawal doesn't change
      // shares, // don't pass
      shares,
      BIGINT_ZERO, // shares burnt don't change
      // pricePerShare
    );

    let deposit = new Deposit(id);

    deposit.account = account.id;
    deposit.vault = vault.id;
    deposit.tokenAmount = inputAmount;
    deposit.sharesMinted = shares;
    deposit.transaction = transaction.id;
    deposit.vaultUpdate = vaultUpdate.id;

    deposit.save();
  }
  
//  export function internalMapWithdrawal(
//     transactionHash:Bytes,
//     transactionIndex: BigInt,
//     to:Address,
//     from: Address,
//     inputShares: BigInt,
//     totalAssets: BigInt,
//     totalSupply: BigInt,
//     pricePerShare: BigInt,
//     blockTimestamp: BigInt,
//     blockNumber: BigInt,
//   ): void {
//   let id = buildId(transactionHash, transactionIndex);
//   let vaultAddress = to;

//   let account = getOrCreateAccount(from);
//   let vault = getOrCreateVault(vaultAddress, false);

//   let amount = totalAssets
//     .times(inputShares)
//     .div(totalSupply);

//    // TODO: refactor this if needed for final implementation 
//   // createOperation(
//   //   id,
//   //   vault.id,
//   //   account.id,
//   //   amount,
//   //   inputShares,
//   //   blockTimestamp,
//   //   blockNumber,
//   //   'Withdrawal',
//   // );

//   let vaultUpdateId = buildUpdateId(
//     vaultAddress,
//     transactionHash,
//     transactionIndex,
//   );

//   createVaultUpdate(
//     tra
//     vaultUpdateId,
//     blockTimestamp,
//     blockNumber,
//     // call.inputs._amount, // don't pass
//     BIGINT_ZERO, // deposit doesn't change
//     amount,
//     // shares, // don't pass
//     BIGINT_ZERO, // shares minted don't change
//     inputShares,
//     vault.id,
//     pricePerShare,
//     // earnings, // don't pass
//     // withdrawalFees, // don't pass
//     // performanceFees, // don't pass
//   );

//   // TODO: accountUpdate
// }

 export function internalMapTransfer(
    transaction: Transaction,
    address: Address,
    from: Address,
    to: Address,
    value: BigInt,
    totalAssets: BigInt,
    totalSupply: BigInt,
    blockTimestamp: BigInt,
    blockNumber: BigInt,
  ): void {
  let id = buildId(transaction.hash, transaction.index);

  let vaultSharesToken = getOrCreateToken(address);
  let vault = getOrCreateVault(address, false);
  let sender = getOrCreateAccount(from);
  let receiver = getOrCreateAccount(to);

  let transfer = new Transfer(id.toString());

  transfer.vault = vault.id;
  transfer.from = sender.id;
  transfer.to = receiver.id;
  transfer.shareToken = vaultSharesToken.id;
  transfer.amount = value;
  transfer.token = vault.token;
  transfer.tokenAmount = totalSupply.equals(BIGINT_ZERO) ? value : totalAssets.times(value).div(totalSupply);

  transfer.timestamp = blockTimestamp;
  transfer.blockNumber = blockNumber;
  transfer.transaction = transaction.id;

  // TODO: accountUpdate

  transfer.save();
}
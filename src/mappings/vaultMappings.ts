import { log } from '@graphprotocol/graph-ts'
import { log } from '@graphprotocol/graph-ts'

import { Address, ethereum, BigInt } from "@graphprotocol/graph-ts";
import {
  StrategyAdded as StrategyAddedEvent,
  StrategyReported as StrategyReportedEvent,
  Transfer as TransferEvent,
  Vault as VaultContract,
} from "../../generated/Registry/Vault";
import { Strategy, StrategyReport, Transaction, Vault } from "../../generated/schema";
import {
  internalMapDeposit,
  internalMapTransfer,
  // internalMapWithdrawal,
} from "../utils/vaultBalanceUpdates";
import { buildIdFromEvent, createEthTransaction, getTimestampInMillis } from "../utils/commons";
import { getOrCreateVault } from "../utils/vault";
import { createStrategy, reportStrategy } from "../utils/strategy";
import { ZERO_ADDRESS } from "../utils/constants";


export function addStrategyToVault(
  transactionId: string,
  vaultAddress: Address,
  strategy: Address,
  debtLimit: BigInt,
  performanceFee: BigInt,
  rateLimit: BigInt,
  event: ethereum.Event,
): void {
  let entity = getOrCreateVault(vaultAddress, false)
  if(entity !== null) {
    let newStrategy = createStrategy(
      transactionId,
      strategy,
      vaultAddress,
      debtLimit,
      rateLimit,
      performanceFee,
      event
    )
    // NOTE: commented since field is derived
    // let strategies = entity.strategies
    // strategies.push(newStrategy.id)
    // entity.strategies = strategies
    // entity.save()
  }
}

export function handleStrategyAdded(event: StrategyAddedEvent): void {
  let ethTransaction = createEthTransaction(event, "StrategyAddedEvent")

  // TODO: refactor to createStrategy since derived links vault + strat
  addStrategyToVault(
    ethTransaction.id,
    event.address,
    event.params.strategy,
    event.params.debtLimit,
    event.params.performanceFee,
    event.params.rateLimit,
    event
  )
}

export function handleStrategyReported(event: StrategyReportedEvent): void {
  let ethTransaction = createEthTransaction(event, "StrategyReportedEvent")
  reportStrategy(
    ethTransaction.id,
    event.params.strategy.toHexString(),
    event.params.gain,
    event.params.loss,
    event.params.totalGain,
    event.params.totalLoss,
    event.params.totalDebt,
    event.params.debtAdded,
    event.params.debtLimit,
    event,
  )
}

export function handleTransfer(event: TransferEvent): void {
  let ethTransaction = createEthTransaction(event, "TransferEvent");
  let vaultContract = VaultContract.bind(event.address);
  if (event.params.sender.toHexString() == ZERO_ADDRESS) { // DEPOSIT
    // let pricePerShareCall = vaultContract.try_pricePerShare();
    // let pricePerShare = pricePerShareCall.reverted ? '' : pricePerShareCall.value;

    internalMapDeposit(
      ethTransaction,
      event.params.receiver,
      event.params.sender,
      event.params.value,
      vaultContract.totalAssets(),
      vaultContract.totalSupply(),
      // pricePerShare,
      event.block.timestamp,
      event.block.number
    );
  } else if (event.params.receiver.toHexString() == ZERO_ADDRESS) {
    // withdrawal
  } else { // TRANSFER
    internalMapTransfer(
      ethTransaction,
      event.address,
      event.params.sender,
      event.params.receiver,
      event.params.value,
      vaultContract.totalAssets(),
      vaultContract.totalSupply(),
      event.block.timestamp,
      event.block.number
    );
  }
}
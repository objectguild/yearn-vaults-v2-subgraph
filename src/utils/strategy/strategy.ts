import { log, ethereum, BigInt, Address, Bytes } from '@graphprotocol/graph-ts';
import {
  Harvest,
  Strategy,
  StrategyReport,
  Transaction,
} from '../../../generated/schema';
import { Strategy as StrategyTemplate } from '../../../generated/templates';
import { Strategy as StrategyContract } from '../../../generated/templates/Vault/Strategy';

import { getTimestampInMillis } from '../commons';

import * as strategyReportLibrary from './strategy-report';

export function create(
  transactionId: string,
  strategyAddress: Address,
  vault: Address,
  debtLimit: BigInt,
  rateLimit: BigInt,
  performanceFee: BigInt,
  event: ethereum.Event
): Strategy {
  log.debug('[Strategy] Create', []);
  let strategyId = strategyAddress.toHexString();
  let strategy = Strategy.load(strategyId);
  if (strategy == null) {
    let strategyContract = StrategyContract.bind(strategyAddress);
    strategy = new Strategy(strategyId);
    strategy.blockNumber = event.block.number;
    strategy.timestamp = getTimestampInMillis(event.block);
    strategy.transaction = transactionId;
    let tryName = strategyContract.try_name();
    strategy.name = tryName.reverted ? 'TBD' : tryName.value.toString();
    strategy.address = strategyAddress;
    strategy.vault = vault.toHexString();
    strategy.debtLimit = debtLimit;
    strategy.rateLimit = rateLimit;
    strategy.performanceFeeBps = performanceFee.toI32();
    strategy.save();
    StrategyTemplate.create(strategyAddress);
  }
  return strategy!;
}

export function createReport(
  transaction: Transaction,
  strategyId: string,
  gain: BigInt,
  loss: BigInt,
  totalGain: BigInt,
  totalLoss: BigInt,
  totalDebt: BigInt,
  debtAdded: BigInt,
  debtLimit: BigInt,
  event: ethereum.Event
): StrategyReport | null {
  log.debug('[Strategy] Create report', []);
  let strategy = Strategy.load(strategyId);
  if (strategy !== null) {
    let latestReport = StrategyReport.load(strategy.latestReport);
    let strategyReport = strategyReportLibrary.getOrCreate(
      transaction.id,
      strategy as Strategy,
      gain,
      loss,
      totalGain,
      totalLoss,
      totalDebt,
      debtAdded,
      debtLimit,
      event
    );
    strategy.latestReport = strategyReport.id;
    strategy.save();

    return strategyReport;
  }
  return null;
}

export function harvest(
  harvester: Address,
  strategyAddress: Address,
  timestamp: BigInt,
  blockNumber: BigInt,
  transactionHash: Bytes,
  transactionIndex: BigInt,
  profit: BigInt,
  loss: BigInt,
  debtPayment: BigInt,
  debtOutstanding: BigInt
): Harvest {
  log.debug('[Strategy] Harvest', []);
  let harvestId = strategyAddress
    .toHexString()
    .concat('-')
    .concat(transactionHash.toHexString())
    .concat('-')
    .concat(transactionIndex.toString());
  let harvest = Harvest.load(harvestId);

  if (harvest == null) {
    let strategyContract = StrategyContract.bind(strategyAddress);
    harvest = new Harvest(harvestId);
    harvest.timestamp = timestamp;
    harvest.blockNumber = blockNumber;
    harvest.transaction = transactionHash.toHexString();
    harvest.vault = strategyContract.vault().toHexString();
    harvest.strategy = strategyAddress.toHexString();
    harvest.harvester = harvester;
    harvest.profit = profit;
    harvest.loss = loss;
    harvest.debtPayment = debtPayment;
    harvest.debtOutstanding = debtOutstanding;
    harvest.save();
  }

  return harvest!;
}

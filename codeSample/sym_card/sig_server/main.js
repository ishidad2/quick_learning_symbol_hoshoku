'use strict';

require('dotenv').config();
const log4js = require('log4js');
const sym = require('symbol-sdk');
const logger = log4js.getLogger('system');
const config = require('./config.js');
const op = require('rxjs/operators');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const multisig = sym.Account.createFromPrivateKey(process.env.MULTISIG_PRIVATE_KEY, sym.NetworkType.TEST_NET);
const main_bot = sym.Account.createFromPrivateKey(process.env.MAIN_BOT_PRIVATE_KEY, sym.NetworkType.TEST_NET);
const sub_bot = sym.Account.createFromPrivateKey(process.env.SUB_BOT_PRIVATE_KEY, sym.NetworkType.TEST_NET);

/**
 * ログの設定
 */
log4js.configure({
  appenders : {
    out: { type: 'stdout' },
    system :  {
      type : 'dateFile',
      filename : 'logs/system.log',
      pattern: "-yyyy-MM-dd"
    }
  },
  categories : {
    default : { appenders : ['out', 'system'], level : 'debug' },
  }
});

function connectNode(nodes) {
  const node = nodes[Math.floor(Math.random() * nodes.length)] ;
  logger.info("try:" + node);
  return new Promise((resolve, reject) => {
    let req = new XMLHttpRequest();
    req.timeout = 2000; //タイムアウト値:2秒(=2000ms)
    req.open('GET', node + "/node/health", true);
    req.onload = function() {
      if (req.status === 200) {
        const status = JSON.parse(req.responseText).status;
        if(status.apiNode == "up" && status.db == "up"){
          return resolve(node);
        }else{
          logger.info("fail node status:" + status);
          return connectNode(nodes).then(node => resolve(node));
        }
      } else {
        logger.info("fail request status:" + req.status)
        return connectNode(nodes).then(node => resolve(node));
      }
    };
    req.onerror = function(e) {
      logger.info("onerror:" + e)
      return connectNode(nodes).then(node => resolve(node));
    };
    req.ontimeout = function (e) {
      logger.info("ontimeout")
      return connectNode(nodes).then(node => resolve(node));
    };  
    req.send();
  });
}

function createRepo(nodes){
  return connectNode(nodes).then(async function onFulfilled(node) {
    const repo = new sym.RepositoryFactoryHttp(node);
    try{
      const epochAdjustment = await repo.getEpochAdjustment().toPromise();
    }catch(error){
      logger.info("fail createRepo" + error);
      return await createRepo(nodes);
    }
    return await repo;
  });
}

async function listenerKeepOpening(nodes){
  const repo = await createRepo(nodes);
  const lner = repo.createListener();
  const txRepo = repo.createTransactionRepository();
  try{
    await lner.open();
    lner.newBlock();
  }catch(e){
    logger.info("fail websocket");
    return await listenerKeepOpening(nodes);
  }
  lner.webSocket.onclose = async function(){
    logger.info("listener onclose");
    return await listenerKeepOpening(nodes);
  }
  return [txRepo, lner];
}

function cosignAggregateBondedTransaction (transaction, account) {
  const cosignatureTransaction = sym.CosignatureTransaction.create(
    transaction,
  );
  return account.signCosignatureTransaction(cosignatureTransaction);
};

const main = async () => {
  const NODES = config.TEST_NET_NODES;
  const [txRepo, listener] = await listenerKeepOpening(NODES);
  listener.open().then(() => {
    logger.info("Open listener")
    //署名が必要なアグリゲートボンデッドトランザクション発生の検知
    listener
      .aggregateBondedAdded(multisig.address)
      .pipe(
        op.filter((_) => !_.signedByAccount(multisig.publicAccount)),
        op.map((transaction) =>
          cosignAggregateBondedTransaction(transaction, main_bot),
        ),
        op.mergeMap((signedCosignatureTransaction) => {
          // listener.close();
          return txRepo.announceAggregateBondedCosignature(
            signedCosignatureTransaction,
          );
        }),
      )
      .subscribe(
        (announcedTransaction) => {
          logger.info(announcedTransaction);
          // listener.close();
        },
        (err) => console.error(err),
      );
    listener
      .aggregateBondedAdded(multisig.address)
      .pipe(
        op.filter((_) => !_.signedByAccount(multisig.publicAccount)),
        op.map((transaction) =>
          cosignAggregateBondedTransaction(transaction, sub_bot),
        ),
        op.mergeMap((signedCosignatureTransaction) => {
          // listener.close();
          return txRepo.announceAggregateBondedCosignature(
            signedCosignatureTransaction,
          );
        }),
      )
      .subscribe(
        (announcedTransaction) => {
          logger.info(announcedTransaction);
          // listener.close();
        },
        (err) => console.error(err),
      );
  });
}

main();
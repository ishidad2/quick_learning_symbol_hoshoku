<hr />

### NoteBookの見方
コード以外の情報 
<span >白/黒での記載は速習Symbol</span>  
<span style="color:red">赤色での記載は補足情報</span>  
<span >コード内で🌟マークがある場所は自分の情報に書き換えが必要</span>

<hr />

# 環境構築

## 0.コンソール接続用ページを開く 
以下リンクを別タブで開き、F12からコンソールを表示させる

https://sym-test-03.opening-line.jp:3001/node/health


以降実行コマンドについては、F12で開いたコンソールに貼り付けて実行していく

### 1.Symbol SDKの読み込み

```js
(script = document.createElement("script")).src = "https://xembook.github.io/nem2-browserify/symbol-sdk-pack-2.0.3.js";
document.getElementsByTagName("head")[0].appendChild(script);

```

## 2.Symbol用の共通設定

```js
NODE = 'https://sym-test-03.opening-line.jp:3001';
sym = require("/node_modules/symbol-sdk");
op = require("/node_modules/rxjs/operators");
repo = new sym.RepositoryFactoryHttp(NODE);
txRepo = repo.createTransactionRepository();
mosaicRepo = repo.createMosaicRepository();
accountRepo = repo.createAccountRepository();
(async () => {
  networkType = await repo.getNetworkType().toPromise();
  generationHash = await repo.getGenerationHash().toPromise();
  epochAdjustment = await repo.getEpochAdjustment().toPromise();
})();
```


## 3.Botアカウントのリストア

```js
alice = sym.Account.createFromPrivateKey("🌟privateKey🌟",networkType);
main_bot = sym.Account.createFromPrivateKey("🌟privateKey🌟",networkType);
sub_bot = sym.Account.createFromPrivateKey("🌟privateKey🌟",networkType);
```

## 4.Botアカウントの起動

main_botとsub_botの書名要求を検知するようにリスナーを登録します。<br />
署名要求があればbotアカウントは自動的に署名を行います。<br />

```js
//ノード一覧
NODES = ["https://sym-test-03.opening-line.jp:3001","https://test01.xymnodes.com:3001"];

function connectNode(nodes) {
    const node = nodes[Math.floor(Math.random() * nodes.length)] ;
    console.log("try:" + node);
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
                    console.log("fail node status:" + status);
                    return connectNode(nodes).then(node => resolve(node));
                }
            } else {
                console.log("fail request status:" + req.status)
                return connectNode(nodes).then(node => resolve(node));
            }
        };
        req.onerror = function(e) {
            console.log("onerror:" + e)
            return connectNode(nodes).then(node => resolve(node));
        };
        req.ontimeout = function (e) {
            console.log("ontimeout")
            return connectNode(nodes).then(node => resolve(node));
        };  
    req.send();
    });
}

function createRepo(nodes){
  return connectNode(nodes).then(async function onFulfilled(node) {
      const repo = new sym.RepositoryFactoryHttp(node);
      try{
          epochAdjustment = await repo.getEpochAdjustment().toPromise();
      }catch(error){
        console.log("fail createRepo");
        return await createRepo(nodes);
      }
      return await repo;
  });
}

async function listenerKeepOpening(nodes){
  const repo = await createRepo(NODES);
  let wsEndpoint = repo.url.replace('http', 'ws') + "/ws";
  const nsRepo = repo.createNamespaceRepository();
  const lner = new sym.Listener(wsEndpoint,nsRepo,WebSocket);
  try{
      await lner.open();
      lner.newBlock();
  }catch(e){
      console.log("fail websocket");
      return await listenerKeepOpening(nodes);
  }
  lner.webSocket.onclose = async function(){
      console.log("listener onclose");
      return await listenerKeepOpening(nodes);
  }
  return lner;
}

listener = await listenerKeepOpening(NODES);

```

## 4-1.AggregateBondedTransaction を共同署名する関数

```js
function cosignAggregateBondedTransaction (transaction, account) {
  const cosignatureTransaction = sym.CosignatureTransaction.create(
    transaction,
  );
  return account.signCosignatureTransaction(cosignatureTransaction);
};
```

## 4-1.受信検知

Bot宛のトランザクションを検知します。

```js
listener.open().then(() => {
  //署名が必要なアグリゲートボンデッドトランザクション発生の検知
  listener
    .aggregateBondedAdded(alice.address)
    .pipe(
      op.filter((_) => !_.signedByAccount(alice.publicAccount)),
      op.map((transaction) =>
        cosignAggregateBondedTransaction(transaction, main_bot),
      ),
      op.mergeMap((signedCosignatureTransaction) => {
        listener.close();
        return txRepo.announceAggregateBondedCosignature(
          signedCosignatureTransaction,
        );
      }),
    )
    .subscribe(
      (announcedTransaction) => {
        console.log(announcedTransaction);
        listener.close();
      },
      (err) => console.error(err),
    );
   listener
    .aggregateBondedAdded(alice.address)
    .pipe(
      op.filter((_) => !_.signedByAccount(alice.publicAccount)),
      op.map((transaction) =>
        cosignAggregateBondedTransaction(transaction, sub_bot),
      ),
      op.mergeMap((signedCosignatureTransaction) => {
        listener.close();
        return txRepo.announceAggregateBondedCosignature(
          signedCosignatureTransaction,
        );
      }),
    )
    .subscribe(
      (announcedTransaction) => {
        console.log(announcedTransaction);
        listener.close();
      },
      (err) => console.error(err),
    );
});
```
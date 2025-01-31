# sym_card

NFCを使ったSymbol決済方法を実現します。


# ローカル環境構築

## モジュールインストール
```
npm install
```

## https設定

```
cd backend
mkdir ssl && cd ssl
openssl req -x509 -newkey rsa:2048 -keyout privatekey.pem -out cert.pem -nodes -days 365
```

Contry Nameに”JP”を指定

```
$ openssl req -x509 -newkey rsa:2048 -keyout privatekey.pem -out cert.pem -nodes -days 365
Generating a RSA private key
.......+++++
............................................+++++
writing new private key to 'privatekey.pem'
-----
You are about to be asked to enter information that will be incorporated
into your certificate request.
What you are about to enter is what is called a Distinguished Name or a DN.
There are quite a few fields but you can leave some blank
For some fields there will be a default value,
If you enter '.', the field will be left blank.
-----
Country Name (2 letter code) [AU]:JP
State or Province Name (full name) [Some-State]:
Locality Name (eg, city) []:
Organization Name (eg, company) [Internet Widgits Pty Ltd]:
Organizational Unit Name (eg, section) []:
Common Name (e.g. server FQDN or YOUR name) []:
Email Address []:
```

# 各種Symbolアカウントは作成されている前提（現在はNFCに書き込むツールを作っていないので）

https://github.com/ishidad2/quick_learning_symbol_hoshoku/blob/main/codeSample/multisig_payment.ipynb

↑こちらの5.アカウントのマルチシグ登録まで実行していれば各種Symbolアカウントは生成されていると思います。

NFCカードへの書き込みはAndroidアプリで行ってください。

私は[NFC Tools](https://play.google.com/store/apps/details?id=com.wakdev.wdnfc&hl=ja&gl=US)というのを使って書き込みました。
NFCには[こちら](https://github.com/ishidad2/quick_learning_symbol_hoshoku/blob/main/codeSample/multisig_payment.ipynb)で作成したqrカウントのプライベートキーのみを書き込みます。（暗号化等はしない）


## フロントエンドサーバーの起動（NFC読み取り）

決済店用のアプリです。（本来はスマートフォンアプリを作成するべきですが、そこまでのスキルとモチベーションがないのでWEBで実装しています）
NFCカードの読み取りはスマートフォン（google chrome）でないと機能しません。（iOSは未検証だが恐らく無理だと思う）

```
npm run dev
```

## バックエンドサーバーの設定（現在は手動）


*アカウントの種類*

「3-1.mutisig,main_bot,sub_bot,qr,bobアカウントの生成」で作成したアカウントは以下に対応します

```
mutisig：MULTISIG_PRIVATE_KEYへ設定
main_bot：MAIN_BOT_PRIVATE_KEYへ設定
sub_bot：SUB_BOT_PRIVATE_KEYへ設定
qr：NFCカードへ書き込むアドレス（書き込みはプライベートキーのみ）
bob：決済店アドレス
```

sig_server/.env.exampleを.envにリネーム後、各プライベートキーを設定

https://github.com/ishidad2/quick_learning_symbol_hoshoku/blob/main/codeSample/sym_card/sig_server/.env.exapmle


```
MULTISIG_PRIVATE_KEY=
MAIN_BOT_PRIVATE_KEY=
SUB_BOT_PRIVATE_KEY=
```


## 自動署名サーバーの起動（署名Botサーバー）

決済を行う際にNFCカードから通知されるトランザクションに自動署名するプログラムです。

```
cd sig_server
node main.js
or
forever start main.js #永続化するならforeverを使用
```

## Androidの端末からPCのローカルサーバにアクセスする

※開発者モードでUSBデバックを有効化した状態で以下を実行

https://www.suzu6.net/posts/141-android-to-pc-localhost/
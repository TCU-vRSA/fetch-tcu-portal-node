# fetch-tcu-portal-node
TCUポータルの差分を取得してくるbotです。DiscordのWebhookに飛ばします。

## 導入

- コマンドの実行
```
git clone https://github.com/TCU-vRSA/fetch-tcu-portal-node.git
cd fetch-tcu-portal-node
yarn install
```

- `.env`ファイルの作成
```
ID=自分の都市大ポータルログインID
PASS=自分の都市大ポータルパスワード
WEBHOOK=DiscordのWebhook URL
```

## 実行

```
node ./main.js
```

後はお好みでcronを設定すると、定期的に巡回して、指定したDiscordチャンネルに差分情報を送信することができます。

## License
MIT License

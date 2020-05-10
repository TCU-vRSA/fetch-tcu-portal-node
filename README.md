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

後はお好みでcronを設定して下さい。

## License
MIT License

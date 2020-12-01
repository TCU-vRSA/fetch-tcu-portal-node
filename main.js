require('dotenv').config();

const fs = require('fs');
const axios = require('axios');
const htmlParser = require('node-html-parser')
const diff = require('diff');

async function main() {
  console.log('TCUポータル更新差分取得bot by TCU-vRSA');
  console.log('現在時間:' + new Date(Date.now()));

  if (!fs.existsSync('./dl/')) {
    fs.mkdirSync('./dl/');
  };

  console.log('認証に必要な情報を取得します...');
  const info = await getLoginInfo().catch(() => {return false});
  if(!info) {
    console.log('認証に必要な情報を取得することが出来ませんでした。ポータルサイトが落ちている可能性があります。');
    await postErrDiscord('認証に必要な情報を取得することが出来ませんでした。ポータルサイトが落ちている可能性があります。');
    process.exit(1);
  } else {
    console.log('認証に必要な情報を取得しました。ログイン処理に移ります...');
  }
  
  await login(info)
    .then(() => {
      console.log('ログインに成功しました。情報の取得に入ります。');
    })
    .catch(async () => {
      console.log('ログインに失敗しました。ポータルサイトが落ちている可能性があります。');
      await postErrDiscord('ログインに失敗しました。ポータルサイトが落ちている可能性があります。');
      process.exit(1);
    });
  
  const fetch_data = await getAuthenticatedPage(info['SESSION_ID'], `https://portal.off.tcu.ac.jp/Portal/Osr/Osr0100.aspx?cId=${process.env.ID}&ct=1`).catch(() => {return false});
  if(!fetch_data) {
    console.log('ページのダウンロードに失敗しました。');
    await postErrDiscord('ページのダウンロードに失敗しました。ポータルサイトが落ちている可能性があります。');
    process.exit(1);
  } else {
    console.log('お知らせページを取得しました。差分チェックに入ります...');
  }

  await judgeContent(fetch_data);
}

function getLoginInfo() {
  return new Promise((resolve, reject) => {
    axios.get('https://portal.off.tcu.ac.jp/OldIndex.aspx', { timeout: 1000 })
      .then( res => {
        const body = res.data;
        const root = htmlParser.parse(body);
        const info = {
          SESSION_ID: res.headers['set-cookie'][0].replace('ASP.NET_SessionId=', '').replace('; path=/; HttpOnly', '').replace(' ', ''),
          VIEWSTATE: root.querySelector('#__VIEWSTATE').rawAttrs.replace('type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value=', '').replace(/\"/g,"").replace(' ', ''),
          VIEWSTATEGENERATOR: root.querySelector('#__VIEWSTATEGENERATOR').rawAttrs.replace('type="hidden" name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value=', '').replace(/\"/g,"").replace(' ', ''),
          EVENTVAIDATION: root.querySelector('#__EVENTVALIDATION').rawAttrs.replace('type="hidden" name="__EVENTVALIDATION" id="__EVENTVALIDATION" value=', '').replace(/\"/g,"").replace(' ', '')
        };
        return info;
      })
      .then(info => {
        setTimeout(() => {
          resolve(info);
        }, 5000);
      })
      .catch(err => {
        reject(err);
      })
  })
}

function login(info) {
  const form = new URLSearchParams();
  form.append('__LASTFOCUS', '');
  form.append('__EVENTTARGET', 'btnLogin');
  form.append('__EVENTARGUMENT', '');
  form.append('__VIEWSTATE', info['VIEWSTATE']);
  form.append('__VIEWSTATEGENERATOR', info['VIEWSTATEGENERATOR']);
  form.append('__VIEWSTATEENCRYPTED', '');
  form.append('__EVENTVALIDATION', info['EVENTVAIDATION']);
  form.append('txtLoginId', process.env.ID);
  form.append('txtPassword', process.env.PASS);

  const options = {
    headers: {
      'Host': 'portal.off.tcu.ac.jp',
      'Origin': 'https://portal.off.tcu.ac.jp',
      'Referer': 'https://portal.off.tcu.ac.jp/OldIndex.aspx',
      'Cookie': `LutherCategory=; ASP.NET_SessionId=${info['SESSION_ID']}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36'
    },
    timeout: 1000,
  };

  return new Promise((resolve, reject) => {
    axios.post('https://portal.off.tcu.ac.jp/OldIndex.aspx', form, options)
      .then(res => {
        resolve(res.data);
      })
      .catch(err => {
        reject(err);
      });
  })
}

function getAuthenticatedPage(session, url) {
  const options = {
    headers: {
      'Host': 'portal.off.tcu.ac.jp',
      'Origin': 'https://portal.off.tcu.ac.jp',
      'Referer': 'https://portal.off.tcu.ac.jp/OldIndex.aspx',
      'Cookie': `LutherCategory=; ASP.NET_SessionId=${session}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36'
    },
    timeout: 1000,
  }

  return new Promise((resolve, reject) => {
    axios.get(url, options)
      .then(res => {
        resolve(res.data);
      })
      .catch(err => {
        console.log(err);
        reject(err);
      })
  });
}

function judgeContent(fetch_data) {
  const path = './dl/';
  return new Promise((resolve, reject) => {
    fs.readFile(path + 'old.txt', 'utf-8', async (err, data) => {
      if(err) {
        console.log('初回読み込みのため、データを保存します。');
        fs.writeFile(path + 'old.txt', fetch_data, 'utf-8', err => {
          if(err) { throw err; };
          console.log('保存が終了しました。');
          resolve();
        });
      }
      else {
        const diffs = diffContent(data, fetch_data);
        if(diffs.length) {
          await postDiscord(diffs).catch(async (err) => {
            console.log('Discord送信中にエラーが発生しました。');
            if(err.response.status === 400) {
              await postErrDiscord('ポータルサイトに何らかの変更があります。文字数が多いため、内容を送信できませんでした。');
            }
          });
        } else {
          console.log(`変更点はありませんでした。`);
        }
        fs.writeFile(path + 'old.txt', fetch_data, 'utf-8', err => {
          if(err) { throw err; };
        });
        resolve();
      }
    });
  })
}

function diffContent(data, fetch_data) {
  const old_root = htmlParser.parse(data);
  const old_search = old_root.querySelector('#MainContent_Contents_divSearch').outerHTML;
  const old_data = old_root.querySelector('#main').outerHTML.replace(old_search, '');

  const new_root = htmlParser.parse(fetch_data);
  const new_search = new_root.querySelector('#MainContent_Contents_divSearch').outerHTML;
  const new_data = new_root.querySelector('#main').outerHTML.replace(new_search, '');

  result = diff.diffLines(old_data, new_data);

  let diffs = [];
  result.forEach(item => {
    if(item.added) {
      diffs.push('追記: ' + item.value.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g,'').replace(/\r?\n/g,'').replace('&nbsp;', '').replace('&lt;', '').replace('&gt;', '').trim());
    }
    // ポータルサイトの場合は削除は要らない？
    // else if(item.removed) {
    //   diffs.push('削除: ' + item.value.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g,'').replace(/\r?\n/g,'').replace('&nbsp;', '').replace('&lt;', '').replace('&gt;', '').trim());
    // }
  });
  return diffs;
}

function postErrDiscord(content) {
  const tmp = {
    "username": "TCU変更通知Bot(Node版)",
    "avatar_url": "https://pbs.twimg.com/profile_images/1250820091018539008/4uztlH6f_400x400.jpg",
    "content": `${content}`,
  };
  const config = {
    headers: {
      'Accept': 'application/json',
      'Content-type': 'application/json',
    }
  }
  return new Promise((resolve, reject) => {
    axios.post(process.env.WEBHOOK, tmp, config)
      .then(res => {
        console.log('Discordに送信しました。');
        resolve();
      })
      .catch(err => {
        console.log('Discord送信中にエラーが発生しました');
        reject(err);
      })
  })
}

function postDiscord(contents) {
  const tmp = {
    "username": "TCU変更通知Bot(Node版)",
    "avatar_url": "https://pbs.twimg.com/profile_images/1250820091018539008/4uztlH6f_400x400.jpg",
    "content": `ポータルサイトのお知らせに変更がありました。`,
    "embeds": [
      {
        "fields": []
      }
    ]
  };
  contents.forEach(item => {
    const t = {
      "name": "変更点",
      "value": item
    }
    tmp.embeds[0].fields.push(t);
  })
  const config = {
    headers: {
      'Accept': 'application/json',
      'Content-type': 'application/json',
    }
  }
  return new Promise((resolve, reject) => {
    axios.post(process.env.WEBHOOK, tmp, config)
      .then(res => {
        console.log('変更点をDiscordに送信しました。');
        resolve();
      })
      .catch(err => {
        console.log('Discord送信中にエラーが発生しました');
        reject(err);
      })
  })
}

main();

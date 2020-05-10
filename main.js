require('dotenv').config();

const fs = require('fs');
const axios = require('axios');
const htmlParser = require('node-html-parser')
const diff = require('diff');

async function main() {
  const info = await getLoginInfo().catch(() => {return false});
  if(!info) {
    console.log('認証に必要な情報を取得することが出来ませんでした。ポータルサイトが落ちている可能性があります。');
    process.exit(1);
  }
  await login(info);
}

function getLoginInfo() {
  return new Promise((resolve, reject) => {
    axios.get('https://portal.off.tcu.ac.jp/OldIndex.aspx')
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
    }
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

main();
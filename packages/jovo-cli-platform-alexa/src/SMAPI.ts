import * as https from 'https';
import { execSync } from 'child_process';

export function createLocalServer() {
    https.createServer({}, (req, res) => {
        console.log(req);
        res.end('Hello World!');
    })
}

export function createAuthorizationCode() {
    // https://www.amazon.com/ap/oa?client_id=amzn1.application-oa2-client.185a4b6a3927442e9eac4d0e331b2102&scope=alexa::ask:skills:readwrite&response_type=token&redirect_uri=localhost:8008
}

export function createAccessToken() {
    // Create local server as a return point

    // open url

    // use the returned values to create access token
}

export function getAccessToken() {
  const stdout = execSync('ask util generate-lwa-tokens');
  return stdout;
}

export function refreshAccessToken() {
  const refreshToken =
    'Atzr|IwEBIKiqhnJj_YCcJsCQ9jYaGfgWS22Xm04PXauCZgfeoeKHyTrYTKS0CRDAVoKclOS261kliHYBX7xHbA6wGKY64QlMyePQhRAldZ_aPJX8FlEi-8ZJcIj1bsffUnbTeQ4pqNalIcBcOrzqGwh3r5o2k1enVaTh6yt3NJa3a6dPQKNf6CyWVTnP3AouaJXW6tn93ZzSyMvCvjbwbND-6ohLshSClWNP9mDHv-BGWG2l83I3tziHuZiObcZ9EOLpFB22jjIm3SRwCQXo2Kg566PNeocr-xWmI0shVvLGEXLKcv-E9h0erdtyTNT0fEWX8io9gCpmJQFbWtSoct4GyfB6kdd7tLdGbUXipVALA3PRxWrDfWlfclhi7fkzfQtbyxWQaU71tMSt3Z7s7bDHIRlYsLC3ZYU_m9Oa3joi04Par8Gng7YI9ZXCeCY5y7dkOO63-mLrpg3-t4b8Sj2ph909Cmwc-tt_e6GURTWsB4knobOwFdQjpBkL-En1gFimvWEcsA0p5tGfLrI8qrHqy-A4P0NtSLCLn-E_f3y1Th7ZM5mf9AT6uZSWGdGQof4HRs2RM7lvsumCSEpdzc3tH_Rq7cYTeFH_SzckARGTm8VJIq62TTyJfYJ4qO5Q6If4AW9_zzgqKubcuSsjVQ_iyve9OI-KEtsStNTB4WDr4izBPPdwqDOX7VYcoTFBgGQDWCNXrIU';

  return new Promise((res, rej) => {
    const req = https.request(
      {
        method: 'POST',
        hostname: 'https://api.amazon.com',
        path: `/auth/o2/token?grant_type=refresh_token&refresh_token=${refreshToken}&client_id=amzn1.application-oa2-client.185a4b6a3927442e9eac4d0e331b2102`,
      },
      (response) => {
        let data = '';

        response.on('data', (d) => {
          data += d;
        });

        response.on('end', () => {
            console.log(data);
          res(data);
        });
      },
    );

    req.on('error', (err) => {
      rej(err);
    });
  });
}

export function createUploadUrl() {
  return new Promise((res, rej) => {
    const req = https.request(
      {
        method: 'POST',
        hostname: 'https://api.amazonalexa.com',
        path: '/v1/skills/uploads',
        headers: {
            // Authorization: 'Authorization'
        }
      },
      (response) => {
        let data = '';

        response.on('data', (d) => {
          data += d;
        });

        response.on('end', () => {
          res(data);
        });
      },
    );

    req.on('error', (err) => {
      rej(err);
    });
  });
}

export function uploadSkillPackage() {}

/*
 * 「年末調整のしかた」タブのリンク確認
 *   node nencho-checker/tests/links.check.js
 * すべてのリンクが国税庁サイトで開けるか（HTTP 200・エラーページでない）を確認し、ページタイトルを表示する。
 */
const L = require(require('path').join(__dirname, '..', 'nencho-links.js'));
(async () => {
    let ok = 0, ng = 0;
    for (const g of L.groups) {
        for (const it of g.items) {
            const url = L.base + it.u;
            let status = 0, title = '';
            try {
                const res = await fetch(url, { redirect: 'follow' });
                status = res.status;
                const buf = Buffer.from(await res.arrayBuffer());
                let html = buf.toString('utf8');
                if (/charset=["']?shift_jis/i.test(html)) html = new TextDecoder('shift_jis').decode(buf);
                title = ((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '').replace(/\s+/g, ' ').trim();
            } catch (e) { title = String(e); }
            const bad = status !== 200 || /表示できませんでした|Not Found/i.test(title) || !/^https:\/\/www\.nta\.go\.jp\//.test(url) || /\.pdf$/i.test(url);
            if (bad) { ng++; console.log('NG', status, url, '|', title); } else { ok++; console.log('OK', it.t, ' ⇔ ', title.replace(/｜国税庁$/, '')); }
        }
    }
    console.log(`links ok=${ok} ng=${ng}`);
    process.exit(ng ? 1 : 0);
})();

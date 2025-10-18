const fetch = require('node-fetch');
(async function(){
  try {
    const res = await fetch('http://localhost:3000/api/tools/get-player-stats', {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ playerId: '2556075', playerName: 'Derrick Henry' })
    });
    const j = await res.json();
    console.log('status', res.status, 'body', j?.rows?.length ? `rows=${j.rows.length}` : j);
  } catch (e) { console.error('err', e); process.exit(1); }
})();

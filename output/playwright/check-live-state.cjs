async (page) => {
  // All ABI payloads below were generated offline with the checked-in ABI.
  const fixture = {
  "selectors": {
    "0xff9c08fa": "missionCount",
    "0x130c29b3": "getMissions",
    "0xa5636076": "getContributions",
    "0xf9168231": "totalEscrowed",
    "0x10f009ff": "totalAwarded",
    "0xd54ad2a1": "totalClaimed",
    "0x402914f5": "claimable"
  },
  "missionCountZero": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "missionCountOne": "0x0000000000000000000000000000000000000000000000000000000000000001",
  "zero": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "escrow": "0x000000000000000000000000000000000000000000000000016345785d8a0001",
  "empty": "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000",
  "open": "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000002222222222222222222222222222222222222222000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000006ad083c2000000000000000000000000000000000000000000000000016345785d8a000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000025436976697175696c6c207665726966696564206c6971756964697479207265736561726368000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002c68747470733a2f2f6578616d706c652e6f72672f636976697175696c6c2d72657365617263682d6272696566000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000104d61726b65742073747275637475726500000000000000000000000000000000",
  "expired": "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000002222222222222222222222222222222222222222000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000005e0be100000000000000000000000000000000000000000000000000016345785d8a000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000025436976697175696c6c207665726966696564206c6971756964697479207265736561726368000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002c68747470733a2f2f6578616d706c652e6f72672f636976697175696c6c2d72657365617263682d6272696566000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000104d61726b65742073747275637475726500000000000000000000000000000000",
  "closed": "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000002222222222222222222222222222222222222222000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000005e0be100000000000000000000000000000000000000000000000000016345785d8a000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000025436976697175696c6c207665726966696564206c6971756964697479207265736561726368000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002c68747470733a2f2f6578616d706c652e6f72672f636976697175696c6c2d72657365617263682d6272696566000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000104d61726b65742073747275637475726500000000000000000000000000000000",
  "contributions": "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000333333333333333333333333333333333333333300000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002f68747470733a2f2f6578616d706c652e6f72672f636976697175696c6c2d72657365617263682d65766964656e63650000000000000000000000000000000000"
};

  const origin = 'http://127.0.0.1:5198';
  const rpcUrl = origin + '/rpc-test';
  const creator = '0x2222222222222222222222222222222222222222';
  const outsider = '0x4444444444444444444444444444444444444444';
  const title = 'Civiquill verified liquidity research';
  const results = [], rpcCalls = [], blockedRequests = [], pageErrors = [];
  let mode = 'error';
  const check = (condition, step, detail = '') => {
    if (!condition) throw new Error(step + (detail ? ': ' + detail : ''));
    results.push({ step, pass: true, ...(detail ? { detail } : {}) });
  };
  const checkNoSamples = async step => {
    const board = page.locator('#missions');
    check(await board.locator('.preview-notice').count() === 0, step + ': no preview notice');
    check(!/SAMPLE BRIEF|Example reward|What does a tokenized stock actually represent/.test(await board.innerText()), step + ': no sample data');
  };
  const requestHandler = async route => {
    const request = route.request(), url = request.url();
    if (!url.startsWith(origin + '/')) {
      blockedRequests.push(url);
      await route.abort('blockedbyclient');
      return;
    }
    if (url !== rpcUrl) { await route.continue(); return; }
    let body;
    try { body = request.postDataJSON(); }
    catch { await route.fulfill({ status: 400, body: 'Invalid mocked JSON-RPC request' }); return; }
    const respond = rpc => {
      rpcCalls.push({ mode, method: rpc.method, selector: rpc.params?.[0]?.data?.slice(0,10) });
      const envelope = { jsonrpc: '2.0', id: rpc.id };
      if (rpc.method === 'eth_chainId') return { ...envelope, result: '0xb626' };
      if (rpc.method === 'eth_blockNumber') return { ...envelope, result: '0x64' };
      if (rpc.method === 'eth_getCode') return { ...envelope, result: '0x60006000' };
      if (rpc.method !== 'eth_call') return { ...envelope, error: { code: -32601, message: 'Only read calls are permitted by this test.' } };
      if (mode === 'error') return { ...envelope, error: { code: -32000, message: 'Intentional Civiquill RPC fixture failure' } };
      const name = fixture.selectors[rpc.params?.[0]?.data?.slice(0,10)];
      let value;
      if (name === 'missionCount') value = mode === 'empty' ? fixture.missionCountZero : fixture.missionCountOne;
      else if (name === 'getMissions') value = fixture[mode];
      else if (name === 'getContributions') value = fixture.contributions;
      else if (name === 'totalEscrowed') value = mode === 'empty' ? fixture.zero : fixture.escrow;
      else if (['totalAwarded','totalClaimed','claimable'].includes(name)) value = fixture.zero;
      if (value) return { ...envelope, result: value };
      return { ...envelope, error: { code: -32601, message: 'Unexpected contract read: ' + name } };
    };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(Array.isArray(body) ? body.map(respond) : respond(body)) });
  };
  const onPageError = error => pageErrors.push(error.message);
  await page.route('**/*', requestHandler);
  page.on('pageerror', onPageError);
  await page.addInitScript(({ zero, creator }) => {
    const listeners = {}, calls = [];
    let accounts = [];
    const wallet = {
      async request({ method }) {
        calls.push(method);
        if (method === 'eth_chainId') return '0xb626';
        if (method === 'eth_accounts') return [...accounts];
        if (method === 'eth_requestAccounts') { accounts = [creator]; return [...accounts]; }
        if (method === 'eth_getBalance') return '0x29a2241af62c0000';
        if (method === 'eth_call') return zero;
        if (method === 'eth_blockNumber') return '0x64';
        throw Object.assign(new Error('Test wallet blocks all writes and unknown methods: ' + method), { code: 4001 });
      },
      on(event, listener) { (listeners[event] ||= []).push(listener); },
      removeListener(event, listener) { listeners[event] = (listeners[event] || []).filter(item => item !== listener); },
    };
    Object.defineProperty(window, 'ethereum', { value: wallet, configurable: true });
    window.__civiquillLiveTest = {
      calls,
      setAccount(address) { accounts = address ? [address] : []; (listeners.accountsChanged || []).forEach(listener => listener([...accounts])); },
    };
  }, { zero: fixture.zero, creator });
  try {
    await page.goto(origin + '/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: /The board couldn.t load/  }).waitFor({ timeout: 20000 });
    check(await page.getByRole('button', { name: 'Try again', exact: true }).isEnabled(), 'RPC error exposes an enabled Retry action');
    await checkNoSamples('RPC error');
    check(!(await page.evaluate(() => window.__civiquillLiveTest.calls)).includes('eth_requestAccounts'), 'Initial load does not request wallet authorization');
    await page.screenshot({ path: 'output/playwright/civiquill-live-rpc-error.png', fullPage: true });

    mode = 'empty';
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await page.getByRole('heading', { name: 'The next question could be yours.' }).waitFor({ timeout: 15000 });
    check(await page.locator('#missions .mission-row').count() === 0, 'A zero-mission registry renders the live empty state');
    await checkNoSamples('Empty registry');

    mode = 'open';
    await page.locator('#missions').getByRole('button', { name: 'Refresh', exact: true }).click();
    await page.getByRole('button', { name: title, exact: true }).waitFor({ timeout: 15000 });
    check(await page.locator('#missions .mission-row').count() === 1, 'Live schema fixture renders exactly one mission');
    check((await page.locator('#missions .mission-row').innerText()).includes('0.100000000000000001'), 'Live reward displays the full 18-decimal amount');
    check((await page.locator('#missions .mission-meta').innerText()).includes('Open'), 'A future deadline displays Open');
    await checkNoSamples('Live registry');
    await page.getByRole('button', { name: title, exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    const publicBrief = dialog.getByRole('link', { name: 'Read the public brief' });
    check(await publicBrief.getAttribute('href') === 'https://example.org/civiquill-research-brief', 'Details link to the on-chain public brief URI');
    check(await publicBrief.getAttribute('rel') === 'noopener noreferrer', 'Public brief opens with safe link attributes');
    await dialog.getByRole('button', { name: 'Contribute', exact: true }).click();
    check(await dialog.getByRole('button', { name: 'Submit research', exact: true }).isEnabled(), 'Open mission enables research submission');
    check(await dialog.getByRole('button', { name: 'Fund this mission', exact: true }).isEnabled(), 'Open mission enables additional funding');
    await dialog.getByRole('button', { name: /^Review/ }).click();
    await dialog.getByRole('link', { name: 'https://example.org/civiquill-research-evidence' }).waitFor({ timeout: 15000 });
    check(await dialog.getByRole('button', { name: 'Approve', exact: true }).count() === 0, 'A visitor has no creator approval action');
    check(await dialog.getByRole('button', { name: 'Return unallocated funds', exact: true }).count() === 0, 'A visitor has no creator refund action');
    await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click();

    await page.locator('.topbar').getByRole('button', { name: 'Connect wallet', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.wallet-button')?.textContent.includes('0x2222'));
    check((await page.evaluate(() => window.__civiquillLiveTest.calls)).filter(method => method === 'eth_requestAccounts').length === 1, 'Only explicit Connect opens one mock authorization request');
    await page.getByRole('button', { name: title, exact: true }).click();
    await dialog.getByRole('button', { name: /^Review/ }).click();
    await dialog.getByRole('button', { name: 'Approve', exact: true }).waitFor();
    check(await dialog.getByRole('button', { name: 'Approve', exact: true }).isEnabled(), 'Creator may allocate rewards before the deadline');
    check(await dialog.getByRole('button', { name: 'Return unallocated funds', exact: true }).isDisabled(), 'Creator cannot refund before the deadline');
    await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click();

    mode = 'expired';
    await page.locator('#missions').getByRole('button', { name: 'Refresh', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#missions .mission-meta')?.textContent.includes('Ended'));
    await page.getByRole('button', { name: title, exact: true }).click();
    await dialog.getByRole('button', { name: 'Contribute', exact: true }).click();
    check(await dialog.getByRole('button', { name: 'Submit research', exact: true }).isDisabled(), 'Expired mission disables research submission');
    check(await dialog.getByRole('button', { name: 'Fund this mission', exact: true }).isDisabled(), 'Expired mission disables funding');
    check((await dialog.innerText()).includes('past its deadline'), 'Expired mission explains why contributions are unavailable');
    await dialog.getByRole('button', { name: /^Review/ }).click();
    await dialog.getByRole('button', { name: 'Approve', exact: true }).waitFor();
    check(await dialog.getByRole('button', { name: 'Approve', exact: true }).isDisabled(), 'Expired mission disables approval');
    check(await dialog.getByRole('button', { name: 'Return unallocated funds', exact: true }).isEnabled(), 'Expired mission enables refund for its creator');
    await page.screenshot({ path: 'output/playwright/civiquill-live-expired-creator.png', fullPage: true });

    await page.evaluate(address => window.__civiquillLiveTest.setAccount(address), outsider);
    await page.waitForFunction(() => !document.querySelector('.refund-panel'));
    check(await dialog.getByRole('button', { name: 'Return unallocated funds', exact: true }).count() === 0, 'Switching to a non-creator removes refund permission');
    check(await dialog.getByRole('button', { name: 'Approve', exact: true }).count() === 0, 'Switching to a non-creator removes approval permission');
    await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click();

    mode = 'closed';
    await page.evaluate(address => window.__civiquillLiveTest.setAccount(address), creator);
    await page.waitForFunction(() => document.querySelector('#missions .mission-meta')?.textContent.includes('Closed'));
    await page.getByRole('button', { name: title, exact: true }).click();
    await dialog.getByRole('button', { name: /^Review/ }).click();
    await dialog.getByRole('button', { name: 'Return unallocated funds', exact: true }).waitFor();
    check(await dialog.getByRole('button', { name: 'Return unallocated funds', exact: true }).isDisabled(), 'A closed mission cannot be refunded twice');
    await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
    const walletCalls = await page.evaluate(() => window.__civiquillLiveTest.calls);
    check(!walletCalls.some(method => /sendTransaction|sendRawTransaction|sign/i.test(method)), 'No wallet write or signature request occurred');
    check(!rpcCalls.some(call => /sendTransaction|sendRawTransaction|sign/i.test(call.method)), 'No RPC write or signature request occurred');
    check(blockedRequests.length === 0, 'All application requests stayed on the local test origin', JSON.stringify(blockedRequests));
    check(pageErrors.length === 0, 'No uncaught browser errors', JSON.stringify(pageErrors));
    return { pass: true, total: results.length, results, rpcCalls: rpcCalls.length, walletCalls, screenshots: ['civiquill-live-rpc-error.png', 'civiquill-live-expired-creator.png'] };
  } catch (error) {
    return { pass: false, failure: error.message, results, rpcCalls, pageErrors, blockedRequests };
  } finally {
    await page.unroute('**/*', requestHandler);
    page.off('pageerror', onPageError);
  }
}

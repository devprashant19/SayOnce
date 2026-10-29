async function runConcurrentSessions() {
  console.log("Simulating 20 concurrent isolated demo sessions...");
  const t0 = Date.now();

  const promises = [];

  for (let i = 0; i < 20; i++) {
    const promise = (async () => {
      // 1. Get signed demo session from server
      const sessionRes = await fetch("http://localhost:3001/api/demo/session");
      const sessionData = await sessionRes.json();
      const token = sessionData.token;
      const sessionId = sessionData.sessionId;

      // 2. Perform fanout request
      const res = await fetch("http://localhost:3001/api/fanout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-demo-session-token": token,
        },
        body: JSON.stringify({
          demoId: i % 2 === 0 ? "demo_in_1" : "demo_in_2",
          spokenText: "sample update",
          contactSet: "india",
          spokenOnIso: "2026-10-29",
        }),
      });

      const data = await res.json();
      return {
        status: res.status,
        sessionId,
        updateId: data.updateId,
        cached: data.cached,
        cardsCount: data.cards?.length,
      };
    })();

    promises.push(promise);
  }

  const results = await Promise.all(promises);
  const elapsed = Date.now() - t0;

  console.log(`Finished 20 concurrent demo sessions in ${elapsed}ms (avg ${Math.round(elapsed / 20)}ms/req)`);

  const uniqueSessionIds = new Set(results.map((r) => r.sessionId));
  const uniqueUpdateIds = new Set(results.map((r) => r.updateId));
  const all200 = results.every((r) => r.status === 200);

  console.log(`- All 20 returned HTTP 200: ${all200}`);
  console.log(`- Unique sessionIds: ${uniqueSessionIds.size} of 20`);
  console.log(`- Unique updateIds (isolated runs): ${uniqueUpdateIds.size} of 20`);
  console.log(`- All runs served cached instant results: ${results.every((r) => r.cached)}`);

  if (!all200 || uniqueUpdateIds.size !== 20 || uniqueSessionIds.size !== 20) {
    console.error("FAIL: Concurrent session isolation failed!");
    process.exit(1);
  }

  console.log("SUCCESS: 20 concurrent demo sessions completely isolated and passed.");
}

runConcurrentSessions().catch((err) => {
  console.error(err);
  process.exit(1);
});

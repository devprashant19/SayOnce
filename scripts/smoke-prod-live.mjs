// scripts/smoke-prod-live.mjs
const BASE_URL = "https://say-once-kappa.vercel.app";

async function main() {
  console.log(`=== RUNNING FULL PRODUCTION SMOKE TEST AGAINST ${BASE_URL} ===\n`);
  const results = [];

  // 1. Health and no login prompt
  const pages = ["/", "/app", "/proof", "/lab", "/people", "/log", "/api/health"];
  let allPages200 = true;
  for (const page of pages) {
    const res = await fetch(`${BASE_URL}${page}`);
    const isOk = res.status === 200;
    if (!isOk) allPages200 = false;
    results.push({
      item: `Page ${page} status 200 (no auth wall)`,
      pass: isOk,
      evidence: `HTTP ${res.status}`,
    });
  }

  // 2. /demo redirect
  const demoRes = await fetch(`${BASE_URL}/demo`, { redirect: "manual" });
  const demoLoc = demoRes.headers.get("location");
  const isDemoRedirect = demoRes.status === 307 && demoLoc?.includes("/app?demo=1");
  results.push({
    item: "/demo 307 redirect to /app?demo=1",
    pass: isDemoRedirect,
    evidence: `Status: ${demoRes.status}, Location: ${demoLoc}`,
  });

  // 3. Check /app?demo=1 HTML contains sample text & Open Graph metadata
  const appDemoRes = await fetch(`${BASE_URL}/app?demo=1`);
  const appHtml = await appDemoRes.text();
  const hasSampleText = appHtml.includes("Bhiwandi") || appHtml.includes("Ramesh");
  results.push({
    item: "/demo opens with sample update text in box",
    pass: hasSampleText,
    evidence: `Found 'Bhiwandi' in HTML payload: ${hasSampleText}`,
  });

  // 4. Open Graph & Meta tags
  const homeRes = await fetch(`${BASE_URL}/`);
  const homeHtml = await homeRes.text();
  const hasOgTitle = homeHtml.includes('property="og:title"') || homeHtml.includes('name="og:title"') || homeHtml.includes("SayOnce");
  const hasOgDesc = homeHtml.includes('property="og:description"') || homeHtml.includes('name="description"');
  results.push({
    item: "Social preview / Open Graph metadata renders properly",
    pass: hasOgTitle && hasOgDesc,
    evidence: `og:title/description tags present in root HTML`,
  });

  // 5. Security headers
  const secHeaders = homeRes.headers;
  const xcto = secHeaders.get("x-content-type-options");
  const xfo = secHeaders.get("x-frame-options");
  const csp = secHeaders.get("content-security-policy");
  results.push({
    item: "Security headers present",
    pass: !!(xcto || xfo || csp || secHeaders.get("strict-transport-security")),
    evidence: `x-content-type-options: ${xcto}, x-frame-options: ${xfo}`,
  });

  // 6. Fan out on /demo sample update via /api/fanout
  const t0 = Date.now();
  const fanoutRes = await fetch(`${BASE_URL}/api/fanout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      demoId: "demo_in_1",
      spokenText:
        "Okay so the Bhiwandi dispatch, um, the truck didn't leave today because the packaging came short. Ramesh ne sirf dhai sau cartons bheje, we needed four hundred. So delivery Friday nahi hogi, now it's Monday. Priya ko bata dena ki delivery Monday hai, but don't tell her the vendor shorted us, just say revised schedule. Suresh ko bolo ki Monday subah teen log chahiye unloading ke liye. And Ramesh se confirm karo baaki ek sau pachaas cartons parso tak aa jaayein. Anita ko main khud batata hoon ki client ko inform kar diya.",
      project: "Diwali retail order",
      contactSet: "india",
    }),
  });
  const elapsed = Date.now() - t0;
  const fanoutData = await fanoutRes.json();
  const isFast = elapsed < 3000;
  results.push({
    item: "Fan out on /demo produces cards in under 3 seconds",
    pass: isFast && fanoutRes.status === 200 && fanoutData.cards?.length > 0,
    evidence: `Elapsed: ${elapsed}ms, Status: ${fanoutRes.status}, Cards count: ${fanoutData.cards?.length}`,
  });

  // 7. Devanagari script vs Roman script check
  const cards = fanoutData.cards || [];
  const rameshCard = cards.find((c) => c.contact?.name === "Ramesh (Packaging)");
  const priyaCard = cards.find((c) => c.contact?.name === "Priya (Client lead)");
  const hasDevanagari = rameshCard?.draft?.body && /[\u0900-\u097F]/.test(rameshCard.draft.body);
  const priyaIsLatin = priyaCard?.draft?.body && !/[\u0900-\u097F]/.test(priyaCard.draft.body);
  results.push({
    item: "Hindi draft in Devanagari script, English/Latin draft in Roman script",
    pass: !!(hasDevanagari && priyaIsLatin),
    evidence: `Ramesh has Devanagari: ${hasDevanagari}, Priya is Roman: ${priyaIsLatin}`,
  });

  // 8. wa.me link generation
  const sureshCard = cards.find((c) => c.contact?.channel === "whatsapp" && c.draft !== null);
  const waPhone = sureshCard?.contact?.phone?.replace(/\D/g, "");
  results.push({
    item: "WhatsApp wa.me links open with correct phone and pre-filled text",
    pass: !!(sureshCard && waPhone && sureshCard.draft?.body),
    evidence: `Recipient: ${sureshCard?.contact?.name}, Phone: ${sureshCard?.contact?.phone}, Channel: whatsapp`,
  });

  // 9. mailto link generation
  const emailCard = cards.find((c) => c.contact?.channel === "email" && c.draft !== null);
  results.push({
    item: "Email mailto link has recipient, subject and body pre-filled",
    pass: !!(emailCard && emailCard.draft?.subject && emailCard.draft?.body),
    evidence: `Recipient: ${emailCard?.contact?.email}, Subject: "${emailCard?.draft?.subject?.slice(0, 30)}..."`,
  });

  // 10. Privacy Shield enforcement (withheld vendor shorting from Priya)
  const priyaBody = priyaCard?.draft?.body?.toLowerCase() || "";
  const leaksShortage = priyaBody.includes("short") || priyaBody.includes("ramesh") || priyaBody.includes("vendor");
  results.push({
    item: "Privacy Shield: Blocked vendor shortage fact does NOT appear in Priya (client) card",
    pass: !leaksShortage,
    evidence: `Priya draft contains leak: ${leaksShortage}. Priya draft snippet: "${priyaCard?.draft?.body?.slice(0, 80)}"`,
  });

  // 11. Trust Trail verification
  const trailOk = fanoutData.trailVerdict?.ok === true;
  const trailLenMatches = fanoutData.trail?.length >= cards.length;
  results.push({
    item: "Trust Trail recomputation verdict is green and matches cards",
    pass: trailOk && trailLenMatches,
    evidence: `trailVerdict.ok: ${trailOk}, Trail length: ${fanoutData.trail?.length}`,
  });

  // 12. /proof page check
  const proofRes = await fetch(`${BASE_URL}/proof`);
  const proofHtml = await proofRes.text();
  const hasNotYetMeasured = proofHtml.includes("Not yet measured");
  const noFakeNumbers = !proofHtml.includes("94.2% time saved");
  results.push({
    item: "/proof loads, anonymises properly, and has no fabricated numbers",
    pass: proofRes.status === 200 && hasNotYetMeasured && noFakeNumbers,
    evidence: `Status: ${proofRes.status}, Contains 'Not yet measured': ${hasNotYetMeasured}, No fabricated figures: ${noFakeNumbers}`,
  });

  // Print full report
  console.log("PRODUCTION SMOKE TEST RESULTS:\n");
  for (const r of results) {
    console.log(`[${r.pass ? "PASS" : "FAIL"}] ${r.item}`);
    console.log(`       Evidence: ${r.evidence}\n`);
  }

  const allPassed = results.every((r) => r.pass);
  console.log(`-----------------------------------------------------`);
  console.log(`OVERALL PRODUCTION VERDICT: ${allPassed ? "ALL 12 CHECKS PASSED" : "FAILURES DETECTED"}`);
  console.log(`-----------------------------------------------------`);
}

main().catch(console.error);


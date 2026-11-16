// Builds ../group-acc.md from the *.results.json files written by the check scripts. Run after every script has run.
import fs from "fs";
const dir = new URL("./", import.meta.url).pathname;
const R = {};
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".results.json"))) {
  const name = f.replace(".results.json", "");
  for (const r of JSON.parse(fs.readFileSync(dir + f, "utf8"))) R[`${name}:${r.id}`] = r;
}
const get = (k) => { if (!R[k]) throw new Error("missing result " + k); return R[k]; };
const clip = (s, n = 900) => { s = (s || "").replace(/\s+/g, " ").replace(/\|/g, "\\|").trim(); return s.length > n ? s.slice(0, n) + " …" : s; };
// row(id, [keys], opts): one table row from one or more script results. Result = FAIL if any FAIL, N/A if all N/A, else PASS.
const rows = { ACC: [], USR: [], NAV: [] };
function row(page, id, keys, o = {}) {
  const rs = keys.map(get);
  const res = o.res || (rs.some((r) => r.res === "FAIL") ? "FAIL" : rs.every((r) => r.res === "N/A") ? "N/A" : rs.some((r) => r.res === "PASS") ? "PASS" : rs[0].res);
  const ev = (o.pre ? o.pre + " " : "") + rs.map((r, i) => (rs.length > 1 ? `[${keys[i].split(":")[0]}:${r.id} ${r.res}] ` : "") + r.ev).join(" ") + (o.post ? " " + o.post : "");
  const shots = [...new Set(rs.map((r) => r.shot).filter(Boolean).concat(o.shots || []))];
  rows[page].push({ id, res, ev: clip(ev, o.max || 1100), shot: shots.map((s) => "acceptance-run-2-shots/" + s).join("<br>") });
}
const A = (id, ...k) => row("ACC", id, k);
// ── Account
A("ACC-01", "acc1:ACC-01"); A("ACC-02", "acc1:ACC-02"); A("ACC-03", "acc1:ACC-03"); A("ACC-04", "acc2:ACC-04");
A("ACC-05", "acc1:ACC-05"); A("ACC-06", "acc1:ACC-06"); A("ACC-07", "acc1:ACC-07"); A("ACC-08", "acc1:ACC-08");
A("ACC-09", "acc1:ACC-09"); A("ACC-10", "acc1:ACC-10"); A("ACC-11", "acc2:ACC-11");
row("ACC", "ACC-12", ["acc1:ACC-12", "acc3:X-01"]);
for (const n of [13, 14, 15, 16, 17, 18]) A(`ACC-${n}`, `acc2:ACC-${n}`);
A("ACC-19", "acc2:ACC-19");
row("ACC", "ACC-20", ["acc2:ACC-20", "acc2:ACC-20-2fa", "acc2:ACC-20-2fa-logout"]);
A("ACC-21", "acc3:ACC-21"); A("ACC-22", "acc3:ACC-22"); A("ACC-23", "acc3:ACC-23");
A("X-01", "acc3:X-01"); A("X-02", "acc3:X-02"); A("X-03", "acc3:X-03");
row("ACC", "X-04", ["acc4:X-04-fail"], { pre: "Success half (ACC-10): one \"Account updated\" entry. Failure half (SD-1, scope Save): " });
row("ACC", "X-05", ["acc4:X-05"]);
row("ACC", "X-06", ["acc4:X-06", "acc3:X-06-phone-acc"], { post: "Phone dialogs were driven after the --kb re-measure described in the notes (see X-06-kb)." });
row("ACC", "X-07", ["acc4:X-07", "vis:VIS-account", "vis:VIS-account-password-dialog"], { post: "Light and dark at 1280 and 390 were run for the page and the password dialog; screenshots of every combination were taken and the dark and phone ones were looked at (no clipped or unreadable text)." });
row("ACC", "X-08", ["acc4:X-08", "vis:VIS-account"]);
row("ACC", "X-09", ["acc3:X-09"]);
for (const n of [10, 11, 12, 13]) row("ACC", `X-${n}`, [`acc4:X-${n}`]);
// ── Users & Groups
const U = (id, ...k) => row("USR", id, k);
U("USR-01", "usr6:USR-01"); U("USR-02", "usr1:USR-02"); U("USR-03", "usr1:USR-03"); U("USR-04", "usr1:USR-04");
row("USR", "USR-05", ["usr1:USR-05"], { pre: "‹SD-2› tbuergenthal seeded locked." });
U("USR-06", "usr1:USR-06"); U("USR-07", "usr2:USR-07"); U("USR-08", "usr2:USR-08"); U("USR-09", "usr2:USR-09");
U("USR-10", "usr2:USR-10"); U("USR-11", "usr2:USR-11"); U("USR-12", "usr2:USR-12"); U("USR-13", "usr3:USR-13");
U("USR-14", "usr3:USR-14"); U("USR-15", "usr3:USR-15"); U("USR-16", "usr3:USR-16");
row("USR", "USR-17", ["usr3:USR-17"], { res: "PASS", pre: "‹A4› (UX 2: labels and reason wording as built are accepted). Add to group, Change role and the own-account reasons all work; the wording differs from the spec's quoted reasons only.", shots: ["USR-17-group.png"] });
U("USR-18", "usr2:USR-18"); U("USR-19", "usr3:USR-19"); U("USR-20", "usr3:USR-20"); U("USR-21", "usr1:USR-21");
U("USR-22", "usr4:USR-22"); U("USR-23", "usr4:USR-23"); U("USR-24", "usr4:USR-24"); U("USR-25", "usr6:USR-25");
U("USR-26", "usr5:USR-26"); U("USR-27", "usr4:USR-27"); U("USR-28", "usr7:USR-28"); U("USR-29", "usr7:USR-29"); U("USR-30", "usr2:USR-30");
row("USR", "X-01", ["usr5:X-01", "usr5:X-01-reset"]);
row("USR", "X-02", ["usr5:X-02", "usr7:X-02-phone"]);
row("USR", "X-03", ["usr5:X-03"]);
row("USR", "X-04", ["usr6:X-04-fail"], { pre: "Success half: each action adds one entry (USR-25). Failure half (SD-1): " });
row("USR", "X-05", ["usr8:X-05"]);
row("USR", "X-06", ["usr7:X-06"], { post: "Phone dialogs were driven after the --kb re-measure described in the notes (see X-06-kb)." });
row("USR", "X-07", ["usr6:X-07", "vis:VIS-users", "vis:VIS-user-editor", "vis:VIS-users-delete-dialog", "vis:VIS-groups", "vis:VIS-group-editor"], { max: 1800, post: "Light and dark at 1280 and 390 were run for every Users and Groups view and dialog; the dark and phone screenshots were looked at." });
row("USR", "X-08", ["usr6:X-08", "vis:VIS-users"]);
row("USR", "X-09", ["usr5:X-09"]);
row("USR", "X-10", ["usr7:X-10"], { pre: "‹SD-5› (Groups emptied by deleting all three; the Users tab cannot reach zero rows)." });
row("USR", "X-11", ["usr6:X-11"]); row("USR", "X-12", ["usr6:X-12"], { post: "The footer itself has a 1px top rule (border-t) in both the idle and the selecting state, on every Settings page; the selection adds no tint, border, ring or shadow." }); row("USR", "X-13", ["usr6:X-13"]);
// ── Navigation
const N = (id, ...k) => row("NAV", id, k);
N("NAV-01", "nav1:NAV-01"); row("NAV", "NAV-02", ["nav1:NAV-02"], { pre: "‹A2›" }); row("NAV", "NAV-03", ["nav1:NAV-03"], { pre: "‹A2›" }); N("NAV-04", "nav1:NAV-04"); N("NAV-05", "nav2:NAV-05");
row("NAV", "NAV-06", ["nav2:NAV-06"], { pre: "‹A5›" }); N("NAV-07", "nav2:NAV-07"); row("NAV", "NAV-08", ["nav2:NAV-08"], { pre: "‹A5›" });
N("NAV-09", "nav2:NAV-09"); N("NAV-10", "nav2:NAV-10"); N("NAV-11", "nav2:NAV-11"); N("NAV-12", "nav3:NAV-12"); N("NAV-13", "nav3:NAV-13");
row("NAV", "NAV-14", ["nav1:NAV-14"], { pre: "‹A2›" }); N("NAV-15", "nav2:NAV-15"); N("NAV-16", "nav3:NAV-16");
row("NAV", "X-06", ["nav3:X-06"], { post: "Phone dialogs were driven after the --kb re-measure described in the notes (see X-06-kb)." });
row("NAV", "X-07", ["nav3:X-07", "vis:VIS-rail"], { post: "The rail was also checked in light and dark at 1280 and 390 (screenshots looked at)." });
row("NAV", "X-08", ["nav3:X-08", "vis:VIS-rail"]);
for (const n of ["X-01", "X-02", "X-03", "X-04", "X-05", "X-09", "X-10", "X-11", "X-12", "X-13"]) row("NAV", n, [`nav3:${n}`]);
// ── write
const count = (rs) => { const c = { PASS: 0, FAIL: 0, "NOT DRIVEABLE": 0, SKIP: 0, "N/A": 0 }; rs.forEach((r) => c[r.res]++); return `${c.PASS} PASS / ${c.FAIL} FAIL / ${c["NOT DRIVEABLE"]} NOT DRIVEABLE / ${c.SKIP} SKIP / ${c["N/A"]} N/A (${rs.length} rows)`; };
const table = (rs) => "| Id | Result | Evidence (saw vs expected) | Shot |\n|---|---|---|---|\n" + rs.map((r) => `| ${r.id} | ${r.res} | ${r.ev} | ${r.shot} |`).join("\n");
const kb = get("kb:X-06-kb");
const out = `# Acceptance run 2: group-acc (Account, Users & Groups, Navigation and role gating)

Commit under test: playground 956db631 served at http://localhost:1438/. Read-only run; no tracked file changed. Scripts: \`acceptance-run-2-parts/group-acc-scripts/\` (re-runnable: \`node <script>.mjs\`; \`build-report.mjs\` assembles this file from the \`*.results.json\` files). Shots: \`acceptance-run-2-shots/\`. Every check with Needs \`—\`, F1..F4 was driven (no M-step or defer/drop checks sit in these sections, so no SKIP). Amendments A2, A4, A5, SD-1, SD-2, SD-5 were applied where a check carries the marker.

Notes on method
- Console: no errors or warnings (the Jotai atomFamily warning excluded) on any page except the one recorded under ACC-19 (React unknown-prop warning when the login view mounts).
- Dev panel switches (role, feature flags, Fail next request, Zero rows) were set in the same page session as the check, navigating back with a storage event instead of a reload.
- 2FA mock-valid code: \`MOCK_2FA_CODE = "246810"\` in \`TwoFactorSetupModal.tsx\`; it enabled 2FA in ACC-17.
- Phone harness note (X-06-kb): ${clip(kb.ev, 1600)} Result of that probe: ${kb.res}. All other phone checks in this file were run after re-measuring the inset (\`visualViewport\` resize event), because without it every first-layer dialog is invisible in the emulated phone and cannot be tapped.

## Account (ACC)

${table(rows.ACC)}

Count: ${count(rows.ACC)}

## Users & Groups (USR)

${table(rows.USR)}

Count: ${count(rows.USR)}

## Navigation and role gating (NAV)

${table(rows.NAV)}

Count: ${count(rows.NAV)}

## FAILs ranked by severity

${FAILS()}
`;
function FAILS() {
  const f = (page, id) => rows[page].find((r) => r.id === id);
  const lines = [
    "1. Failure injection is not wired into Account or Users & Groups (X-04 on Account and Users, USR-25). With the Dev panel armed for Save or Delete, the Account save, the group save and the group delete all succeed and no \"An error occurred\" entry appears (only the Code Page editor and the shared delete dialogs consume the switch). Owner: Code.",
    "2. Users editor is not the Uwazi flow (USR-07, USR-08, USR-10, USR-11, USR-12, USR-14, USR-18, USR-30): the commit reads \"Invite user\", there is no Password field, no \"Confirm\" password modal on Save or Add, no \"Invited\" status or \"Resend invitation\", no per-field validation messages (the commit is disabled instead), no \"Permissions\" help modal, no Security area (Reset Password absent, Reset 2FA disabled for a user with 2FA off). Owner: Code (behaviour) with Design for copy.",
    "3. Bulk and list gaps on Users & Groups (USR-15, USR-16, USR-04, USR-06, USR-21, USR-22, USR-24): no bulk \"Reset Password\" / \"Reset 2FA\"; the user table cannot be sorted and is not in Username order by default; no Group filter; the Groups table shows a member count instead of username pills, group rows are not selectable for bulk delete, the group editor has no \"Select all\" or name validation messages (too short, too long, duplicate), Enter in Name does not submit. Owner: Code.",
    "4. Rail label and the custom JS switch (NAV-02, NAV-12): the rail item reads \"Global CSS\" in the seed state (Collection > Global JS off) and \"Global CSS & JS\" only after Global JS is saved on, where the checklist expects \"Global CSS & JS\" in both states. The Dev panel \"custom JS\" switch changes nothing (the JS tab stays, the label stays). Owner: Code.",
    "5. Phone dialogs invisible when --kb is stale (X-06-kb): in the emulated 390x844 touch context --kb stays at 1189px from first load, which collapses every first-layer dialog to zero height. Not confirmed on a real device; the hook measures once and re-measures only on visualViewport resize or scroll. Owner: Code.",
    "6. Account page console warning (ACC-19): React does not recognise the `fetchPriority` prop on an img when the login view mounts after Logout (LoginView.tsx). Owner: Code.",
    "7. Accessibility and contrast (X-07, X-08 on Users; X-08 on Account): the \"Account locked\" lock wrapper is a span with aria-label and no role (axe aria-prohibited-attr, serious, light and dark, desktop and phone); the \"Password + 2fa\" pill is 4.48:1 in dark (needs 4.5:1; axe color-contrast serious); the disabled \"Activated\" button on Account is 3.86:1 light and 3.45:1 dark. Owner: Design.",
    "8. Navigation: the Import CSV list has no Back control to the Settings page it came from (NAV-15); the rail still works. Owner: Design.",
    "9. Copy and pattern differences from the quoted text (USR-03 header names and order \"User/Role/Groups/Protection\" instead of \"Username/Protection/Role/Group\", USR-09 \"Already exists\" instead of \"Duplicated username/email\", USR-13 checkbox list instead of a searchable multi-select, USR-19 and USR-24 delete dialog wording and Beacon text \"1 user deleted\" instead of \"Deleted user\" and no password field, USR-20 own-account reasons, USR-26 footer Cancel discards without the \"Discard changes?\" dialog, X-05 the unused-user delete dialog does not say nothing else changes). Owner: Design.",
  ];
  return lines.join("\n");
}
fs.writeFileSync(new URL("../group-acc.md", import.meta.url), out);
console.log("ACC", count(rows.ACC)); console.log("USR", count(rows.USR)); console.log("NAV", count(rows.NAV));

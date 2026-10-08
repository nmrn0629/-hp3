// 令和8年分（令和8年度税制改正反映後）の照合テスト。期待値は国税庁「令和8年分 年末調整のしかた」Ⅰ変わった点、タックスアンサー No.1199/1410/1195/1177/1175/1140 等
const R = require(process.argv[2] || require("path").join(__dirname, "..", "nencho-rules.js"));
let pass = 0, fail = 0;
function eq(label, got, exp) { if (got === exp) pass++; else { fail++; console.log('FAIL', label, 'got', got, 'expected', exp); } }
const r8 = R.RULES[2026], r7 = R.RULES[2025];
const get = (res, key) => res.items.find(i => i.key === key);

// --- 給与所得（令和8年分）No.1410 ---
eq('R8 収入70万 → なし(0)', R.salaryIncome(700000, r8), 0);
eq('R8 収入74.1万 → 1,000', R.salaryIncome(741000, r8), 1000);
eq('R8 収入136万 → 所得62万', R.salaryIncome(1360000, r8), 620000);
eq('R8 収入163万 → 所得89万', R.salaryIncome(1630000, r8), 890000);
eq('R8 収入197万 → 所得123万', R.salaryIncome(1970000, r8), 1230000);
eq('R8 収入207万 → 所得133万', R.salaryIncome(2070000, r8), 1330000);
eq('R8 収入219.0万 → 145.0万', R.salaryIncome(2190000, r8), 1450000);
eq('R8 収入219.1万 → 145.1万', R.salaryIncome(2191000, r8), 1451000);
eq('R8 収入219.3万 → 145.3万', R.salaryIncome(2193000, r8), 1453000);
eq('R8 収入219.6万 → 145.6万', R.salaryIncome(2196000, r8), 1456000);
eq('R8 収入220万 → 146万 (控除74万)', R.salaryIncome(2200000, r8), 1460000);
eq('R8 収入206万 → 所得132万 (基礎控除境界)', R.salaryIncome(2060000, r8), 1320000);
eq('R8 収入300万 → 控除98万', R.salaryDeductionAmount(3000000, r8), 980000);
eq('R8 収入500万 → 所得356万', R.salaryIncome(5000000, r8), 3560000);
eq('R8 収入850万 → 所得655万', R.salaryIncome(8500000, r8), 6550000);
eq('R8 収入1000万 → 所得805万', R.salaryIncome(10000000, r8), 8050000);
// --- 給与所得（令和7年分）---
eq('R7 収入123万 → 所得58万', R.salaryIncome(1230000, r7), 580000);
eq('R7 収入150万 → 所得85万', R.salaryIncome(1500000, r7), 850000);
eq('R7 収入188万 → 所得123万', R.salaryIncome(1880000, r7), 1230000);
eq('R7 収入190万 → 所得125万', R.salaryIncome(1900000, r7), 1250000);

// --- 基礎控除（令和8年分）No.1199 ---
const basicR8 = (inc) => R.calculate({ year: 2026, self: { salary: 0, otherIncome: inc, marital: 'single' }, dependents: [], insurance: {} });
eq('R8 基礎 所得132万 → 104万', get(basicR8(1320000), 'basic').amount, 1040000);
eq('R8 基礎 所得336万 → 104万', get(basicR8(3360000), 'basic').amount, 1040000);
eq('R8 基礎 所得489万 → 104万', get(basicR8(4890000), 'basic').amount, 1040000);
eq('R8 基礎 所得489万+1 → 67万', get(basicR8(4890001), 'basic').amount, 670000);
eq('R8 基礎 所得655万 → 67万', get(basicR8(6550000), 'basic').amount, 670000);
eq('R8 基礎 所得655万+1 → 62万', get(basicR8(6550001), 'basic').amount, 620000);
eq('R8 基礎 所得2350万 → 62万', get(basicR8(23500000), 'basic').amount, 620000);
eq('R8 基礎 所得2350万+1 → 48万', get(basicR8(23500001), 'basic').amount, 480000);
eq('R8 基礎 所得2450万 → 32万', get(basicR8(24500000), 'basic').amount, 320000);
eq('R8 基礎 所得2500万 → 16万', get(basicR8(25000000), 'basic').amount, 160000);
eq('R8 基礎 所得2500万+1 → 0', get(basicR8(25000001), 'basic').amount, 0);
// 令和7年分は従来どおり
const basicR7 = (inc) => R.calculate({ year: 2025, self: { salary: 0, otherIncome: inc, marital: 'single' }, dependents: [], insurance: {} });
eq('R7 基礎 所得132万 → 95万', get(basicR7(1320000), 'basic').amount, 950000);
eq('R7 基礎 所得336万 → 88万', get(basicR7(3360000), 'basic').amount, 880000);
eq('R7 基礎 所得489万 → 68万', get(basicR7(4890000), 'basic').amount, 680000);
eq('R7 基礎 所得655万 → 63万', get(basicR7(6550000), 'basic').amount, 630000);
eq('R7 基礎 所得700万 → 58万', get(basicR7(7000000), 'basic').amount, 580000);

// --- 扶養親族・配偶者の所得要件 62万（令和8年分） ---
const dep = (year, salary, birthY) => R.calculate({ year, self: { salary: 5000000, marital: 'single' },
  dependents: [{ relation: 'child', birth: { y: birthY, m: 6, d: 1 }, salary }], insurance: {} });
eq('R8 子17歳 給与136万(所得62万) → 扶養控除38万', get(dep(2026, 1360000, 2009), 'dependent_0').amount, 380000);
eq('R8 子17歳 給与136万+1 → 扶養控除なし', get(dep(2026, 1360001, 2009), 'dependent_0').amount, 0);
eq('R7 子17歳 給与123万(所得58万) → 38万', get(dep(2025, 1230000, 2008), 'dependent_0').amount, 380000);
eq('R7 子17歳 給与124万 → なし', get(dep(2025, 1240000, 2008), 'dependent_0').amount, 0);
// 特定親族特別控除 62万超〜（R8） No.1177
eq('R8 子20歳 給与136万 → 特定扶養63万', get(dep(2026, 1360000, 2006), 'dependent_0').amount, 630000);
eq('R8 子20歳 給与137万(所得63万) → 特定親族特別 63万', get(dep(2026, 1370000, 2006), 'specrel_0').amount, 630000);
eq('R8 子20歳 給与159万(所得85万) → 63万', get(dep(2026, 1590000, 2006), 'specrel_0').amount, 630000);
eq('R8 子20歳 給与164万(所得90万) → 61万', get(dep(2026, 1640000, 2006), 'specrel_0').amount, 610000);
eq('R8 子20歳 給与197万(所得123万) → 3万', get(dep(2026, 1970000, 2006), 'specrel_0').amount, 30000);
eq('R8 子20歳 給与198万 → 対象外', get(dep(2026, 1980000, 2006), 'dependent_0').amount, 0);

// 配偶者（R8） No.1191/1195
const sp = (year, spSalary, selfSalary = 5000000) => R.calculate({ year, self: { salary: selfSalary, marital: 'married' },
  spouse: { birth: { y: 1980, m: 1, d: 1 }, salary: spSalary }, dependents: [], insurance: {} });
eq('R8 配偶者 給与136万 → 配偶者控除38万', get(sp(2026, 1360000), 'spouse').amount, 380000);
eq('R8 配偶者 給与137万(所得63万) → 配偶者特別控除38万', get(sp(2026, 1370000), 'spouse').amount, 380000);
eq('R8 配偶者 給与170万(所得96万) → 36万', get(sp(2026, 1700000), 'spouse').amount, 360000);
eq('R8 配偶者 給与207万(所得133万) → 3万', get(sp(2026, 2070000), 'spouse').amount, 30000);
eq('R8 配偶者 給与208万 → 0', get(sp(2026, 2080000), 'spouse').amount, 0);
eq('R8 配偶者 所得63万 本人所得950万以下 → 26万', get(sp(2026, 1370000, 11150000), 'spouse').amount, 260000);

// 勤労学生（R8：89万／給与163万） No.1175
const ws = (year, salary) => R.calculate({ year, self: { salary, marital: 'single', workingStudent: true }, dependents: [], insurance: {} });
eq('R8 勤労学生 給与163万 → 27万', get(ws(2026, 1630000), 'student').amount, 270000);
eq('R8 勤労学生 給与163万+1 → 0', get(ws(2026, 1630001), 'student').amount, 0);
eq('R7 勤労学生 給与150万 → 27万', get(ws(2025, 1500000), 'student').amount, 270000);
eq('R7 勤労学生 給与151万 → 0', get(ws(2025, 1510000), 'student').amount, 0);

// ひとり親（R8：子の所得62万） No.1171、控除額は35万のまま（Q&A 3-2）
const single = (year, childSalary) => R.calculate({ year, self: { salary: 3000000, marital: 'single' },
  dependents: [{ relation: 'child', birth: { y: 2006, m: 6, d: 1 }, salary: childSalary }], insurance: {} });
eq('R8 ひとり親 子の給与136万 → 35万', get(single(2026, 1360000), 'single').amount, 350000);
eq('R8 ひとり親 子の給与137万 → 0', get(single(2026, 1370000), 'single').amount, 0);

// 生命保険料控除の特例（R8） No.1140
const life = (year, lifeNew, lifeOld, withChild) => R.calculate({ year, self: { salary: 5000000, marital: 'single' },
  dependents: withChild ? [{ relation: 'child', birth: { y: 2015, m: 1, d: 1 }, salary: 0 }] : [], insurance: { lifeNew, lifeOld } });
eq('R8 新10万 23歳未満あり → 5.5万', get(life(2026, 100000, 0, true), 'life').amount, 55000);
eq('R8 新13万 23歳未満あり → 6万', get(life(2026, 130000, 0, true), 'life').amount, 60000);
eq('R8 新10万 23歳未満なし → 4万', get(life(2026, 100000, 0, false), 'life').amount, 40000);
eq('R8 新5万+旧5万 23歳未満あり → 3.5万+3.75万=7.25万→上限6万', get(life(2026, 50000, 50000, true), 'life').amount, 60000);
eq('R8 新5万+旧5万 23歳未満なし → 上限4万', get(life(2026, 50000, 50000, false), 'life').amount, 40000);
eq('R8 旧のみ12万 → 5万', get(life(2026, 0, 120000, true), 'life').amount, 50000);
eq('R7 新10万 23歳未満あり → 4万（特例なし）', get(life(2025, 100000, 0, true), 'life').amount, 40000);

// 総合（R8）：年収500万・配偶者パート110万・大学生の子バイト150万・同居の母72歳(年金所得50万)・小学生
const c1 = R.calculate({ year: 2026, self: { salary: 5000000, marital: 'married' },
  spouse: { birth: { y: 1976, m: 5, d: 10 }, salary: 1100000 },
  dependents: [
    { name: '長男', relation: 'child', birth: { y: 2006, m: 4, d: 1 }, salary: 1500000 },
    { name: '長女', relation: 'child', birth: { y: 2015, m: 8, d: 15 }, salary: 0 },
    { name: '母', relation: 'parent', birth: { y: 1954, m: 3, d: 3 }, salary: 0, otherIncome: 500000, cohabiting: true }],
  insurance: { social: 200000, mutual: 276000, lifeNew: 100000, care: 50000, pensionOld: 60000, quake: 30000 } });
eq('C1 合計所得356万', c1.self.totalIncome, 3560000);
eq('C1 基礎控除 104万', get(c1, 'basic').amount, 1040000);
eq('C1 配偶者控除 38万 (配偶者所得36万)', get(c1, 'spouse').amount, 380000);
eq('C1 長男 給与150万→所得76万 → 特定親族特別控除63万', get(c1, 'specrel_0').amount, 630000);
eq('C1 母 同居老親 58万', get(c1, 'dependent_2').amount, 580000);
eq('C1 生保 12万', get(c1, 'life').amount, 120000);
eq('C1 所得控除合計', c1.totals.deductions, 1040000 + 380000 + 630000 + 580000 + 200000 + 276000 + 120000 + 30000);
console.log(`pass=${pass} fail=${fail}`); process.exit(fail ? 1 : 0);

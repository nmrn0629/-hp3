/**
 * 年末調整 控除額チェッカー ― 計算ルール（所得税）
 *
 * 年分ごとの控除テーブルと判定ロジックを UI から分離したモジュール。
 * ブラウザでは window.NenchoRules、Node では module.exports として公開する。
 *
 * 【来年以降の更新方法】
 *   RULES に新しい年分のエントリを追加（既存年をコピーして改正点だけ書き換える）し、
 *   nencho-app.js 側の年分セレクトに追加するだけでよい。
 *
 * 根拠（国税庁HPで照合済み・2026-10-08）：
 *   - 令和7年度税制改正：基礎控除・給与所得控除（最低保障65万円）の見直し、特定親族特別控除の創設、
 *     扶養親族等の所得要件 58万円への引上げ（令和7年分に適用）
 *   - 令和8年度税制改正（令和8年12月1日施行・令和8年分以後に適用）：
 *       基礎控除の引上げ（合計所得489万円以下 104万円、489万超655万以下 67万円、655万超2,350万以下 62万円）、
 *       給与所得控除の最低保障額 74万円（収入220万円以下）と収入69.1万〜220万円未満の給与所得の特例、
 *       扶養親族・同一生計配偶者・ひとり親の子の所得要件 62万円、特定親族 62万超123万以下、
 *       配偶者特別控除の対象 62万超133万以下、勤労学生 89万円以下
 *   - 年齢23歳未満の扶養親族を有する場合の生命保険料控除の特例（令和8・9年分）：
 *       新生命保険料に係る一般生命保険料控除の限度額 6万円（新旧合算も6万円、合計限度12万円は不変）
 *   - ひとり親控除 38万円への引上げは令和9年分以後（令和8年分は35万円のまま）
 *   出典：国税庁「令和8年分 年末調整のしかた」Ⅰ昨年と比べて変わった点、
 *         「令和8年度税制改正（所得税の基礎控除の引上げ等関係）Q&A」、タックスアンサー No.1199/1410/1180/1191/1195/1177/1160/1170/1171/1175/1140/1145/1411/2260
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.NenchoRules = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // ------------------------------------------------------------------
    // 年分ごとのルール表
    // ------------------------------------------------------------------
    var COMMON = {
        // 給与所得控除（令和7年分：最低保障 65万円・収入190万円まで）
        // variant 'R7' … 190万円未満は別表第五に準じた刻み（1,619,000円以上は1,000〜4,000円刻み）
        // variant 'R8' … 令和8・9年分の特例：69万1,000円以上74万1,000円未満は所得なし、
        //                 74万1,000円以上219万1,000円未満は「収入−74万円」、219万1,000円〜220万円未満は3段階の定額
        salaryDeduction: {
            variant: 'R7',
            min: 650000,
            flatUpTo: 1900000,
            max: 1950000
        },
        // 扶養親族等の所得要件を給与収入に換算した目安（表示用）
        salaryHints: {
            dependent: 1230000,      // 所得58万円 ⇔ 給与収入123万円
            specificRelativeMax: 1880000, // 所得123万円 ⇔ 給与収入188万円
            spouseSpecialMax: 2015999,    // 所得133万円 ⇔ 給与収入201万5,999円
            workingStudent: 1500000  // 所得85万円 ⇔ 給与収入150万円
        },
        // 基礎控除（合計所得金額の上限, 控除額）令和7年分
        basic: [
            [1320000, 950000],
            [3360000, 880000],
            [4890000, 680000],
            [6550000, 630000],
            [23500000, 580000],
            [24000000, 480000],
            [24500000, 320000],
            [25000000, 160000],
            [Infinity, 0]
        ],
        // 扶養親族・同一生計配偶者などの所得要件
        dependentIncomeLimit: 580000,
        // 配偶者控除（本人所得の上限 → [一般, 老人]）
        spouse: [
            [9000000, 380000, 480000],
            [9500000, 260000, 320000],
            [10000000, 130000, 160000]
        ],
        // 配偶者特別控除：配偶者所得の上限ごとに [本人900万以下, 950万以下, 1000万以下]
        spouseSpecial: [
            [950000, 380000, 260000, 130000],
            [1000000, 360000, 240000, 120000],
            [1050000, 310000, 210000, 110000],
            [1100000, 260000, 180000, 90000],
            [1150000, 210000, 140000, 70000],
            [1200000, 160000, 110000, 60000],
            [1250000, 110000, 80000, 40000],
            [1300000, 60000, 40000, 20000],
            [1330000, 30000, 20000, 10000]
        ],
        // 扶養控除
        dependent: {
            general: 380000,      // 16歳以上（特定・老人以外）
            specific: 630000,     // 19歳以上23歳未満
            elderly: 480000,      // 70歳以上
            elderlyParent: 580000 // 70歳以上の同居直系尊属
        },
        // 特定親族特別控除（19歳以上23歳未満、所得が扶養親族の所得要件超123万円以下）
        specificRelative: [
            [850000, 630000],
            [900000, 610000],
            [950000, 510000],
            [1000000, 410000],
            [1050000, 310000],
            [1100000, 210000],
            [1150000, 110000],
            [1200000, 60000],
            [1230000, 30000]
        ],
        disability: { general: 270000, special: 400000, specialCohabiting: 750000 },
        widow: { amount: 270000, incomeLimit: 5000000 },
        singleParent: { amount: 350000, incomeLimit: 5000000, childIncomeLimit: 580000 },
        workingStudent: { amount: 270000, incomeLimit: 850000, nonWorkIncomeLimit: 100000 },
        // 所得金額調整控除（子ども等）
        incomeAdjustment: { threshold: 8500000, cap: 10000000, rate: 0.10 },
        // 生命保険料控除
        lifeInsurance: {
            newCap: 40000, oldCap: 50000, total: 120000,
            // 令和8・9年分：23歳未満の扶養親族がいる場合の一般（新契約）上限（null なら特例なし）
            generalNewCapWithYoungDependent: null
        },
        earthquake: { cap: 50000, longTermCap: 15000 },
        // 所得税率（課税所得上限, 税率, 控除額）
        taxRates: [
            [1950000, 0.05, 0],
            [3300000, 0.10, 97500],
            [6950000, 0.20, 427500],
            [9000000, 0.23, 636000],
            [18000000, 0.33, 1536000],
            [40000000, 0.40, 2796000],
            [Infinity, 0.45, 4796000]
        ],
        reconstructionRate: 0.021
    };

    function extend(base, override) {
        var out = {};
        Object.keys(base).forEach(function (k) { out[k] = base[k]; });
        Object.keys(override).forEach(function (k) {
            if (override[k] && typeof override[k] === 'object' && !Array.isArray(override[k]) &&
                base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
                out[k] = extend(base[k], override[k]);
            } else {
                out[k] = override[k];
            }
        });
        return out;
    }

    var RULES = {
        2025: extend(COMMON, {
            year: 2025,
            label: '令和7年分',
            judgeDateLabel: '令和7年12月31日'
        }),
        2026: extend(COMMON, {
            year: 2026,
            label: '令和8年分',
            judgeDateLabel: '令和8年12月31日',
            // 令和8年度税制改正（令和8年12月1日施行）
            salaryDeduction: { variant: 'R8', min: 740000, flatUpTo: 2200000 },
            salaryHints: {
                dependent: 1360000,
                specificRelativeMax: 1970000,
                spouseSpecialMax: 2070000,
                workingStudent: 1630000
            },
            basic: [
                [1320000, 1040000],
                [3360000, 1040000],
                [4890000, 1040000],
                [6550000, 670000],
                [23500000, 620000],
                [24000000, 480000],
                [24500000, 320000],
                [25000000, 160000],
                [Infinity, 0]
            ],
            dependentIncomeLimit: 620000,
            singleParent: { childIncomeLimit: 620000 },
            workingStudent: { incomeLimit: 890000 },
            // 年齢23歳未満の扶養親族を有する場合の特例（令和8・9年分）
            lifeInsurance: { generalNewCapWithYoungDependent: 60000 }
        })
    };

    // ------------------------------------------------------------------
    // ユーティリティ
    // ------------------------------------------------------------------
    /** 全角数字・全角記号を半角に正規化する（例："１，２３４" → "1,234"） */
    function normalizeDigits(v) {
        return String(v == null ? '' : v)
            .replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
            .replace(/[，、]/g, ',')
            .replace(/[．。]/g, '.')
            .replace(/[－ー−]/g, '-');
    }

    function toInt(v) {
        var n = Number(normalizeDigits(v).replace(/[^\d.-]/g, ''));
        return isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
    }

    function lookup(table, value, col) {
        for (var i = 0; i < table.length; i++) {
            if (value <= table[i][0]) return table[i][col == null ? 1 : col];
        }
        return 0;
    }

    /**
     * 年齢（その年の12月31日時点）。
     * 年齢計算ニ関スル法律により誕生日の前日に加齢するため、
     * 1月1日生まれは前年12月31日に満年齢に達する。
     * → 翌年1月1日時点の通常計算と同値になる。
     */
    function ageAtYearEnd(birth, year) {
        if (!birth || !birth.y || !birth.m || !birth.d) return null;
        var age = (year + 1) - birth.y;
        // 翌年1月1日より誕生日(月日)が後なら未到達
        if (birth.m > 1 || (birth.m === 1 && birth.d > 1)) age -= 1;
        return age;
    }

    /** 給与所得（所得金額調整控除 適用前）。年末調整等のための給与所得控除後の給与等の金額の表（別表第五）に準拠。 */
    function salaryIncome(revenue, rules) {
        var r = toInt(revenue);
        var sd = rules.salaryDeduction;
        if (r <= 0) return 0;
        var A = Math.floor(r / 4000) * 4000;
        if (sd.variant === 'R8') {
            // 令和8・9年分：収入69万1,000円以上220万円未満の特例（租税特別措置法）
            if (r < 741000) return 0;
            if (r < 2191000) return r - 740000;
            if (r < 2193000) return 1451000;
            if (r < 2196000) return 1453000;
            if (r < 2200000) return 1456000;
        } else {
            // 令和7年分
            if (r < 1619000) return Math.max(0, r - sd.min);
            if (r < 1620000) return 969000;
            if (r < 1622000) return 970000;
            if (r < 1624000) return 972000;
            if (r < 1628000) return 974000;
            if (r < sd.flatUpTo) return A - sd.min;
        }
        if (r < 3600000) return Math.floor(A * 0.7) - 80000;
        if (r < 6600000) return Math.floor(A * 0.8) - 440000;
        if (r < 8500000) return Math.floor(r * 0.9) - 1100000;
        return r - sd.max;
    }

    function salaryDeductionAmount(revenue, rules) {
        var r = toInt(revenue);
        if (r <= 0) return 0;
        return r - salaryIncome(r, rules);
    }

    // 生命保険料控除：新契約の算式（上限 cap：4万 または 特例 6万）
    function lifeNewFormula(paid, cap) {
        var p = toInt(paid);
        var unit = cap / 4; // 4万→1万, 6万→1.5万
        if (p <= unit * 2) return p;
        if (p <= unit * 4) return Math.ceil(p / 2 + unit);
        if (p <= unit * 8) return Math.ceil(p / 4 + unit * 2);
        return cap;
    }

    // 生命保険料控除：旧契約の算式（上限 5万）
    function lifeOldFormula(paid) {
        var p = toInt(paid);
        if (p <= 25000) return p;
        if (p <= 50000) return Math.ceil(p / 2 + 12500);
        if (p <= 100000) return Math.ceil(p / 4 + 25000);
        return 50000;
    }

    function longTermFormula(paid) {
        var p = toInt(paid);
        if (p <= 10000) return p;
        if (p <= 20000) return Math.ceil(p / 2 + 5000);
        return 15000;
    }

    function disabilityAmount(kind, cohabiting, rules) {
        if (kind === 'special') {
            return cohabiting ? rules.disability.specialCohabiting : rules.disability.special;
        }
        if (kind === 'general') return rules.disability.general;
        return 0;
    }

    function disabilityLabel(kind, cohabiting) {
        if (kind === 'special') return cohabiting ? '同居特別障害者' : '特別障害者';
        if (kind === 'general') return '一般の障害者';
        return '';
    }

    function yen(n) {
        return (n == null ? 0 : n).toLocaleString('ja-JP') + '円';
    }

    /** 万円表記（例：620000 → "62万円"、2015999 → "201万5,999円"） */
    function man(n) {
        n = toInt(n);
        var m = Math.floor(n / 10000), rest = n % 10000;
        return m + '万' + (rest ? rest.toLocaleString('ja-JP') : '') + '円';
    }

    // ------------------------------------------------------------------
    // メイン計算
    // ------------------------------------------------------------------
    function calculate(input) {
        var year = Number(input.year) || 2026;
        var rules = RULES[year] || RULES[2026];
        var self = input.self || {};
        var spouse = input.spouse || null;
        var deps = Array.isArray(input.dependents) ? input.dependents : [];
        var ins = input.insurance || {};
        var limit = rules.dependentIncomeLimit;
        var specRelMax = rules.specificRelative[rules.specificRelative.length - 1][0];
        var spouseSpecialMax = rules.spouseSpecial[rules.spouseSpecial.length - 1][0];

        var items = [];
        var notes = [];
        var persons = [];

        // ---- 本人の所得 ----
        var selfSalary = toInt(self.salary);
        var selfOther = toInt(self.otherIncome);
        var selfSalaryIncomeRaw = salaryIncome(selfSalary, rules);
        var salaryDed = salaryDeductionAmount(selfSalary, rules);

        // ---- 配偶者の判定 ----
        var sp = null;
        if (spouse) {
            var spIncome = salaryIncome(spouse.salary, rules) + toInt(spouse.otherIncome);
            var spAge = ageAtYearEnd(spouse.birth, year);
            sp = {
                role: 'spouse',
                label: '配偶者',
                age: spAge,
                income: spIncome,
                salary: toInt(spouse.salary),
                isDouitsuSeikei: spIncome <= limit,       // 同一生計配偶者
                isElderly: spAge != null && spAge >= 70,
                disability: spouse.disability || 'none',
                cohabiting: spouse.cohabiting !== false
            };
        }

        // ---- 扶養親族の判定 ----
        var depResults = deps.map(function (d, idx) {
            var income = salaryIncome(d.salary, rules) + toInt(d.otherIncome);
            var age = ageAtYearEnd(d.birth, year);
            var res = {
                role: 'dependent',
                index: idx,
                label: d.name || ('扶養親族' + (idx + 1)),
                relation: d.relation || 'other',
                age: age,
                income: income,
                salary: toInt(d.salary),
                cohabiting: d.cohabiting !== false,
                disability: d.disability || 'none',
                isFuyou: income <= limit,            // 扶養親族（所得が所得要件以下）
                category: null,
                categoryLabel: '',
                amount: 0,
                specificRelativeAmount: 0,
                disabilityAmount: 0,
                disabilityLabel: '',
                reasons: []
            };
            if (age == null) {
                res.reasons.push('生年月日が未入力のため年齢区分を判定できません');
            }
            if (res.isFuyou) {
                if (age == null) {
                    res.categoryLabel = '判定不可';
                } else if (age < 16) {
                    res.category = 'under16';
                    res.categoryLabel = '16歳未満（年少扶養親族）';
                    res.reasons.push('16歳未満のため扶養控除の対象外（住民税の非課税判定・所得金額調整控除等には影響）');
                } else if (age >= 19 && age < 23) {
                    res.category = 'specific';
                    res.categoryLabel = '特定扶養親族';
                    res.amount = rules.dependent.specific;
                } else if (age >= 70) {
                    var isParent = res.relation === 'parent';
                    if (isParent && res.cohabiting) {
                        res.category = 'elderlyParent';
                        res.categoryLabel = '老人扶養親族（同居老親等）';
                        res.amount = rules.dependent.elderlyParent;
                    } else {
                        res.category = 'elderly';
                        res.categoryLabel = '老人扶養親族';
                        res.amount = rules.dependent.elderly;
                    }
                } else {
                    res.category = 'general';
                    res.categoryLabel = '一般の控除対象扶養親族';
                    res.amount = rules.dependent.general;
                }
                // 障害者控除（扶養親族は年齢不問）
                res.disabilityAmount = disabilityAmount(res.disability, res.cohabiting, rules);
                res.disabilityLabel = disabilityLabel(res.disability, res.cohabiting);
            } else {
                // 所得要件超 → 扶養親族ではない。特定親族特別控除の可能性
                if (age != null && age >= 19 && age < 23 && income <= specRelMax) {
                    res.category = 'specificRelative';
                    res.categoryLabel = '特定親族（特定親族特別控除）';
                    res.specificRelativeAmount = lookup(rules.specificRelative, income);
                } else {
                    res.category = 'none';
                    res.categoryLabel = '控除対象外';
                    res.reasons.push('合計所得金額が' + yen(limit) + 'を超えるため扶養親族に該当しません' +
                        (age != null && age >= 19 && age < 23 ? '（所得' + man(specRelMax) + '超のため特定親族特別控除も対象外）' : ''));
                }
                if (res.disability !== 'none') {
                    res.reasons.push('扶養親族に該当しないため障害者控除の対象になりません');
                }
            }
            return res;
        });

        // ---- 所得金額調整控除（子ども等） ----
        var hasYoungDependent = depResults.some(function (d) { return d.isFuyou && d.age != null && d.age < 23; });
        var hasSpecialDisabledFamily =
            (sp && sp.isDouitsuSeikei && sp.disability === 'special') ||
            depResults.some(function (d) { return d.isFuyou && d.disability === 'special'; });
        var adj = 0;
        var adjReason = '';
        if (selfSalary > rules.incomeAdjustment.threshold) {
            if (self.disability === 'special' || hasYoungDependent || hasSpecialDisabledFamily) {
                adj = Math.floor((Math.min(selfSalary, rules.incomeAdjustment.cap) - rules.incomeAdjustment.threshold) * rules.incomeAdjustment.rate);
                adjReason = self.disability === 'special' ? 'ご本人が特別障害者' :
                    hasYoungDependent ? '23歳未満の扶養親族あり' : '特別障害者である同一生計配偶者・扶養親族あり';
            } else {
                adjReason = '給与収入850万円超ですが、要件（23歳未満の扶養親族／特別障害者）に該当しません';
            }
        } else if (selfSalary > 0) {
            adjReason = '給与収入が850万円以下のため対象外';
        }

        var selfSalaryIncome = Math.max(0, selfSalaryIncomeRaw - adj);
        var totalIncome = selfSalaryIncome + selfOther; // 合計所得金額（見込み）

        // ---- 1. 基礎控除 ----
        var basic = lookup(rules.basic, totalIncome);
        items.push({
            key: 'basic', name: '基礎控除', amount: basic, applied: basic > 0,
            note: basic > 0
                ? '合計所得金額 ' + yen(totalIncome) + ' に応じた控除額'
                : '合計所得金額が2,500万円を超えるため適用なし'
        });

        // ---- 2. 配偶者控除／配偶者特別控除 ----
        if (sp) {
            var spItem = { key: 'spouse', name: '配偶者控除', amount: 0, applied: false, note: '' };
            if (totalIncome > 10000000) {
                spItem.note = 'ご本人の合計所得金額が1,000万円を超えるため、配偶者控除・配偶者特別控除とも適用なし';
            } else if (sp.isDouitsuSeikei) {
                var col = sp.isElderly ? 2 : 1;
                spItem.amount = lookup(rules.spouse, totalIncome, col);
                spItem.applied = spItem.amount > 0;
                spItem.name = sp.isElderly ? '配偶者控除（老人控除対象配偶者）' : '配偶者控除';
                spItem.note = '配偶者の合計所得金額 ' + yen(sp.income) + '（' + yen(limit) + '以下）' +
                    (sp.isElderly ? '、70歳以上' : '') + '、ご本人の合計所得金額 ' + yen(totalIncome);
            } else if (sp.income <= spouseSpecialMax) {
                var col2 = totalIncome <= 9000000 ? 1 : totalIncome <= 9500000 ? 2 : 3;
                spItem.name = '配偶者特別控除';
                spItem.amount = lookup(rules.spouseSpecial, sp.income, col2);
                spItem.applied = spItem.amount > 0;
                spItem.note = '配偶者の合計所得金額 ' + yen(sp.income) + '、ご本人の合計所得金額 ' + yen(totalIncome);
            } else {
                spItem.name = '配偶者控除／配偶者特別控除';
                spItem.note = '配偶者の合計所得金額 ' + yen(sp.income) + ' が' + man(spouseSpecialMax) + 'を超えるため適用なし';
            }
            items.push(spItem);

            // 配偶者の障害者控除（同一生計配偶者であること）
            if (sp.disability !== 'none') {
                var spDis = sp.isDouitsuSeikei ? disabilityAmount(sp.disability, sp.cohabiting, rules) : 0;
                items.push({
                    key: 'disability_spouse', name: '障害者控除（配偶者：' + disabilityLabel(sp.disability, sp.cohabiting) + '）',
                    amount: spDis, applied: spDis > 0,
                    note: spDis > 0 ? '同一生計配偶者（所得' + yen(limit) + '以下）のため適用'
                        : '配偶者の合計所得金額が' + yen(limit) + 'を超えるため同一生計配偶者に該当せず適用なし'
                });
            }
            persons.push(sp);
        }

        // ---- 3. 扶養控除・特定親族特別控除・扶養親族の障害者控除 ----
        var fuyouTotal = 0, specRelTotal = 0;
        depResults.forEach(function (d) {
            persons.push(d);
            if (d.amount > 0) {
                fuyouTotal += d.amount;
                items.push({
                    key: 'dependent_' + d.index, name: '扶養控除（' + d.label + '：' + d.categoryLabel + '）',
                    amount: d.amount, applied: true,
                    note: (d.age != null ? rules.judgeDateLabel + '時点 ' + d.age + '歳、' : '') + '合計所得金額 ' + yen(d.income)
                });
            } else if (d.specificRelativeAmount > 0) {
                specRelTotal += d.specificRelativeAmount;
                items.push({
                    key: 'specrel_' + d.index, name: '特定親族特別控除（' + d.label + '）',
                    amount: d.specificRelativeAmount, applied: true,
                    note: rules.judgeDateLabel + '時点 ' + d.age + '歳、合計所得金額 ' + yen(d.income) + '（' + man(limit) + '超' + man(specRelMax) + '以下）'
                });
            } else {
                items.push({
                    key: 'dependent_' + d.index, name: '扶養控除（' + d.label + '）', amount: 0, applied: false,
                    note: d.categoryLabel + (d.reasons.length ? '：' + d.reasons.join('。') : '')
                });
            }
            if (d.disabilityAmount > 0) {
                items.push({
                    key: 'disability_dep_' + d.index, name: '障害者控除（' + d.label + '：' + d.disabilityLabel + '）',
                    amount: d.disabilityAmount, applied: true,
                    note: '扶養親族の障害者控除は16歳未満でも適用されます'
                });
            }
        });

        // ---- 4. 本人の障害者控除 ----
        if (self.disability && self.disability !== 'none') {
            var selfDis = self.disability === 'special' ? rules.disability.special : rules.disability.general;
            items.push({
                key: 'disability_self', name: '障害者控除（ご本人：' + (self.disability === 'special' ? '特別障害者' : '一般の障害者') + '）',
                amount: selfDis, applied: true, note: ''
            });
        }

        // ---- 5. 寡婦控除／ひとり親控除 ----
        var marital = self.marital || (sp ? 'married' : 'single');
        var hasQualifyingChild = depResults.some(function (d) {
            return d.relation === 'child' && d.income <= rules.singleParent.childIncomeLimit;
        });
        var hasAnyFuyou = depResults.some(function (d) { return d.isFuyou; });
        if (!sp && marital !== 'married') {
            if (self.commonLawSpouse) {
                items.push({ key: 'single', name: 'ひとり親控除／寡婦控除', amount: 0, applied: false,
                    note: '事実上婚姻関係と同様の事情にある方がいる場合は適用なし' });
            } else if (totalIncome > rules.singleParent.incomeLimit) {
                items.push({ key: 'single', name: 'ひとり親控除／寡婦控除', amount: 0, applied: false,
                    note: 'ご本人の合計所得金額が500万円を超えるため適用なし' });
            } else if (hasQualifyingChild) {
                items.push({ key: 'single', name: 'ひとり親控除', amount: rules.singleParent.amount, applied: true,
                    note: '生計を一にする子（総所得金額等' + man(rules.singleParent.childIncomeLimit) + '以下）あり、合計所得金額500万円以下' });
            } else if (marital === 'widowed') {
                items.push({ key: 'single', name: '寡婦控除', amount: rules.widow.amount, applied: true,
                    note: '夫と死別（または生死不明）後、婚姻していない方（扶養親族の有無を問わない）' });
            } else if (marital === 'divorced') {
                if (hasAnyFuyou) {
                    items.push({ key: 'single', name: '寡婦控除', amount: rules.widow.amount, applied: true,
                        note: '夫と離婚後、婚姻しておらず扶養親族あり' });
                } else {
                    items.push({ key: 'single', name: '寡婦控除', amount: 0, applied: false,
                        note: '離婚の場合、扶養親族（所得' + man(limit) + '以下）がいることが要件のため適用なし' });
                }
            } else {
                items.push({ key: 'single', name: 'ひとり親控除', amount: 0, applied: false,
                    note: '生計を一にする子（総所得金額等' + man(rules.singleParent.childIncomeLimit) + '以下）がいないため適用なし' });
            }
        }

        // ---- 6. 勤労学生控除 ----
        if (self.workingStudent) {
            var ws = rules.workingStudent;
            var nonWork = selfOther; // 給与以外の所得
            var wsOk = totalIncome <= ws.incomeLimit && nonWork <= ws.nonWorkIncomeLimit;
            items.push({
                key: 'student', name: '勤労学生控除', amount: wsOk ? ws.amount : 0, applied: wsOk,
                note: wsOk ? '合計所得金額' + man(ws.incomeLimit) + '以下（給与収入' + man(rules.salaryHints.workingStudent) + '以下）かつ給与以外の所得10万円以下'
                    : (totalIncome > ws.incomeLimit ? '合計所得金額が' + man(ws.incomeLimit) + '（給与収入' + man(rules.salaryHints.workingStudent) + '）を超えるため適用なし'
                        : '給与以外の所得が10万円を超えるため適用なし')
            });
        }

        // ---- 7. 社会保険料控除 ----
        var social = toInt(ins.social);
        items.push({
            key: 'social', name: '社会保険料控除', amount: social, applied: social > 0,
            note: social > 0 ? '支払額の全額（給与天引き分は会社が把握済み。ここでは申告書に記載する分のみ）'
                : '国民年金・国民健康保険など、ご自身で支払った分があれば入力してください（給与天引き分は会社側で加算されます）'
        });

        // ---- 8. 小規模企業共済等掛金控除 ----
        var mutual = toInt(ins.mutual);
        items.push({
            key: 'mutual', name: '小規模企業共済等掛金控除', amount: mutual, applied: mutual > 0,
            note: mutual > 0 ? 'iDeCo・小規模企業共済等の掛金全額' : 'iDeCo等の掛金があれば入力してください'
        });

        // ---- 9. 生命保険料控除 ----
        var li = rules.lifeInsurance;
        var generalNewCap = (li.generalNewCapWithYoungDependent && hasYoungDependent) ? li.generalNewCapWithYoungDependent : li.newCap;
        var gNew = lifeNewFormula(ins.lifeNew, generalNewCap);
        var gOld = lifeOldFormula(ins.lifeOld);
        var generalCombined;
        if (toInt(ins.lifeNew) > 0 && toInt(ins.lifeOld) > 0) {
            generalCombined = Math.max(gOld, Math.min(gNew + gOld, generalNewCap));
        } else {
            generalCombined = Math.max(gNew, gOld);
        }
        var care = lifeNewFormula(ins.care, li.newCap);
        var pNew = lifeNewFormula(ins.pensionNew, li.newCap);
        var pOld = lifeOldFormula(ins.pensionOld);
        var pensionCombined;
        if (toInt(ins.pensionNew) > 0 && toInt(ins.pensionOld) > 0) {
            pensionCombined = Math.max(pOld, Math.min(pNew + pOld, li.newCap));
        } else {
            pensionCombined = Math.max(pNew, pOld);
        }
        var lifeTotal = Math.min(generalCombined + care + pensionCombined, li.total);
        var lifeDetail = [];
        if (generalCombined > 0) lifeDetail.push('一般 ' + yen(generalCombined) + (generalNewCap > li.newCap ? '（23歳未満の扶養親族ありのため新契約上限6万円の特例適用）' : ''));
        if (care > 0) lifeDetail.push('介護医療 ' + yen(care));
        if (pensionCombined > 0) lifeDetail.push('個人年金 ' + yen(pensionCombined));
        items.push({
            key: 'life', name: '生命保険料控除', amount: lifeTotal, applied: lifeTotal > 0,
            note: lifeTotal > 0 ? lifeDetail.join('、') + (generalCombined + care + pensionCombined > li.total ? '（合計上限12万円）' : '')
                : '控除証明書の金額を入力してください',
            detail: { general: generalCombined, care: care, pension: pensionCombined, generalNewCap: generalNewCap }
        });

        // ---- 10. 地震保険料控除 ----
        var quake = Math.min(toInt(ins.quake), rules.earthquake.cap);
        var longTerm = longTermFormula(ins.longTerm);
        var quakeTotal = Math.min(quake + longTerm, rules.earthquake.cap);
        items.push({
            key: 'quake', name: '地震保険料控除', amount: quakeTotal, applied: quakeTotal > 0,
            note: quakeTotal > 0 ? '地震保険料 ' + yen(quake) + (longTerm > 0 ? '、旧長期損害保険料 ' + yen(longTerm) : '') + '（上限5万円）'
                : '控除証明書の金額を入力してください'
        });

        // ---- 合計 ----
        var totalDeductions = items.reduce(function (s, it) { return s + (it.amount || 0); }, 0);
        var taxable = Math.max(0, Math.floor((totalIncome - totalDeductions) / 1000) * 1000);
        var baseTax = 0;
        for (var i = 0; i < rules.taxRates.length; i++) {
            if (taxable <= rules.taxRates[i][0]) {
                baseTax = Math.floor(taxable * rules.taxRates[i][1] - rules.taxRates[i][2]);
                break;
            }
        }
        var housingLoan = toInt(input.housingLoan);
        var afterCredit = Math.max(0, baseTax - housingLoan);
        var estimatedTax = Math.floor(Math.floor(afterCredit * (1 + rules.reconstructionRate)) / 100) * 100;

        return {
            year: year,
            rules: rules,
            self: {
                salary: selfSalary,
                otherIncome: selfOther,
                salaryDeduction: salaryDed,
                salaryIncomeRaw: selfSalaryIncomeRaw,
                incomeAdjustment: adj,
                incomeAdjustmentReason: adjReason,
                salaryIncome: selfSalaryIncome,
                totalIncome: totalIncome
            },
            persons: persons,
            items: items,
            totals: {
                fuyou: fuyouTotal,
                specificRelative: specRelTotal,
                deductions: totalDeductions,
                taxable: taxable,
                baseTax: baseTax,
                housingLoan: housingLoan,
                estimatedTax: estimatedTax
            }
        };
    }

    // ------------------------------------------------------------------
    // 障害者手帳等 → 所得税法上の障害者区分（所得税法施行令第10条、タックスアンサー No.1160）
    // ------------------------------------------------------------------
    var DISABILITY_HANDBOOKS = [
        { key: 'none', label: '手帳・認定なし' },
        { key: 'shintai', label: '身体障害者手帳', grades: [
            { v: '1', label: '1級', kind: 'special' }, { v: '2', label: '2級', kind: 'special' },
            { v: '3', label: '3級', kind: 'general' }, { v: '4', label: '4級', kind: 'general' },
            { v: '5', label: '5級', kind: 'general' }, { v: '6', label: '6級', kind: 'general' }
        ] },
        { key: 'seishin', label: '精神障害者保健福祉手帳', grades: [
            { v: '1', label: '1級', kind: 'special' }, { v: '2', label: '2級', kind: 'general' }, { v: '3', label: '3級', kind: 'general' }
        ] },
        { key: 'ryoiku', label: '療育手帳（愛の手帳・みどりの手帳など）', grades: [
            { v: 'A', label: '重度（A・Ⓐ・1度・2度 など）', kind: 'special' },
            { v: 'B', label: '中度・軽度（B・3度・4度 など）', kind: 'general' }
        ] },
        { key: 'sensho', label: '戦傷病者手帳', grades: [
            { v: 'special', label: '特別項症〜第3項症', kind: 'special' },
            { v: 'other', label: '第4項症以下・款症', kind: 'general' }
        ] },
        { key: 'genbaku', label: '原子爆弾被爆者（厚生労働大臣の認定）', kind: 'special' },
        { key: 'netakiri', label: '常に就床を要し複雑な介護を要する（寝たきり・引き続き6か月以上）', kind: 'special' },
        { key: 'kouken', label: '精神上の障害により事理を弁識する能力を欠く常況（成年被後見人など）', kind: 'special' },
        { key: 'nintei', label: '65歳以上で市町村長等の認定を受けている（障害者控除対象者認定書）', grades: [
            { v: 'general', label: '障害者に準ずる認定', kind: 'general' },
            { v: 'special', label: '特別障害者に準ずる認定', kind: 'special' }
        ] }
    ];

    function classifyDisability(handbook, grade) {
        var hb = null;
        for (var i = 0; i < DISABILITY_HANDBOOKS.length; i++) {
            if (DISABILITY_HANDBOOKS[i].key === handbook) { hb = DISABILITY_HANDBOOKS[i]; break; }
        }
        if (!hb || hb.key === 'none') return { kind: 'none', label: '該当なし', basis: '' };
        if (hb.grades) {
            for (var j = 0; j < hb.grades.length; j++) {
                if (hb.grades[j].v === String(grade)) {
                    return { kind: hb.grades[j].kind, label: hb.grades[j].kind === 'special' ? '特別障害者' : '一般の障害者',
                        basis: hb.label + ' ' + hb.grades[j].label };
                }
            }
            return { kind: 'none', label: '等級を選択してください', basis: hb.label, pending: true };
        }
        return { kind: hb.kind, label: hb.kind === 'special' ? '特別障害者' : '一般の障害者', basis: hb.label };
    }

    // ------------------------------------------------------------------
    // 家族一人ひとりの判定
    // ------------------------------------------------------------------
    function judgePerson(input) {
        var year = Number(input.year) || 2026;
        var rules = RULES[year] || RULES[2026];
        var self = input.self || {};
        var p = input.person || {};
        var limit = rules.dependentIncomeLimit;
        var specRelMax = rules.specificRelative[rules.specificRelative.length - 1][0];
        var spouseSpecialMax = rules.spouseSpecial[rules.spouseSpecial.length - 1][0];

        var selfIncome = salaryIncome(self.salary, rules) + toInt(self.otherIncome);
        var selfSalary = toInt(self.salary);
        var income = salaryIncome(p.salary, rules) + toInt(p.otherIncome);
        var age = ageAtYearEnd(p.birth, year);
        var cohabiting = p.cohabiting !== false;
        var dis = classifyDisability(p.handbook, p.grade);
        var excluded = [];
        if (p.businessEmployee) excluded.push('青色事業専従者として給与を受けている（または白色事業専従者）');
        if (p.claimedByOther) excluded.push('他の人の同一生計配偶者・扶養親族として申告されている');
        var isExcluded = excluded.length > 0;

        var categories = [];
        var deductions = [];
        var notes = [];
        var adjReasons = [];
        function cat(key, label, ok, reason, form) { categories.push({ key: key, label: label, ok: !!ok, reason: reason || '', form: form || '' }); return !!ok; }
        function ded(name, amount, applied, note, form) { deductions.push({ name: name, amount: amount || 0, applied: !!applied, note: note || '', form: form || '' }); }

        var disCohab = dis.kind === 'special' && cohabiting;
        var disLabelFull = dis.kind === 'special' ? (disCohab ? '同居特別障害者' : '特別障害者') : (dis.kind === 'general' ? '一般の障害者' : '該当なし');
        var disAmount = disabilityAmount(dis.kind, cohabiting, rules);

        if (p.relation === 'spouse') {
            var douitsu = cat('douitsu', '同一生計配偶者', !isExcluded && income <= limit,
                isExcluded ? excluded.join('、') : (income <= limit ? '合計所得金額 ' + yen(income) + '（' + man(limit) + '以下）' : '合計所得金額 ' + yen(income) + ' が' + man(limit) + 'を超える'));
            var koujo = cat('koujo', '控除対象配偶者', douitsu && selfIncome <= 10000000,
                !douitsu ? '同一生計配偶者に該当しない' : (selfIncome <= 10000000 ? 'ご本人の合計所得金額 ' + yen(selfIncome) + '（1,000万円以下）' : 'ご本人の合計所得金額が1,000万円を超える'),
                '給与所得者の配偶者控除等申告書');
            var roujin = cat('roujin', '老人控除対象配偶者', koujo && age != null && age >= 70,
                age == null ? '生年月日未入力' : (koujo && age >= 70 ? rules.judgeDateLabel + '時点 ' + age + '歳' : (koujo ? rules.judgeDateLabel + '時点 ' + age + '歳（70歳未満）' : '控除対象配偶者に該当しない')));
            cat('gensen', '源泉控除対象配偶者', !isExcluded && selfIncome <= 9000000 && income <= 950000,
                isExcluded ? excluded.join('、') : (selfIncome > 9000000 ? 'ご本人の合計所得金額が900万円を超える' : (income <= 950000 ? '配偶者の所得95万円以下・ご本人の所得900万円以下' : '配偶者の合計所得金額が95万円を超える')),
                '給与所得者の扶養控除等（異動）申告書 A欄');
            var tokubetsu = cat('tokubetsu', '配偶者特別控除の対象', !isExcluded && income > limit && income <= spouseSpecialMax && selfIncome <= 10000000,
                isExcluded ? excluded.join('、') : (income <= limit ? '所得' + man(limit) + '以下のため配偶者控除の対象（特別控除ではない）' : (income > spouseSpecialMax ? '合計所得金額が' + man(spouseSpecialMax) + 'を超える' : (selfIncome > 10000000 ? 'ご本人の合計所得金額が1,000万円を超える' : '配偶者の合計所得金額 ' + yen(income) + '（' + man(limit) + '超' + man(spouseSpecialMax) + '以下）'))),
                '給与所得者の配偶者控除等申告書');

            if (koujo) {
                var amt = lookup(rules.spouse, selfIncome, roujin ? 2 : 1);
                ded(roujin ? '配偶者控除（老人控除対象配偶者）' : '配偶者控除', amt, amt > 0,
                    'ご本人の合計所得金額 ' + yen(selfIncome) + '、配偶者の合計所得金額 ' + yen(income), '配偶者控除等申告書');
            } else {
                ded('配偶者控除', 0, false, !douitsu ? '同一生計配偶者に該当しない' : 'ご本人の合計所得金額が1,000万円を超えるため適用なし', '');
            }
            if (tokubetsu) {
                var col = selfIncome <= 9000000 ? 1 : selfIncome <= 9500000 ? 2 : 3;
                var amt2 = lookup(rules.spouseSpecial, income, col);
                ded('配偶者特別控除', amt2, amt2 > 0, '配偶者の合計所得金額 ' + yen(income) + '、ご本人の合計所得金額 ' + yen(selfIncome), '配偶者控除等申告書');
            } else {
                ded('配偶者特別控除', 0, false, income <= limit && !isExcluded ? '配偶者控除の対象のため特別控除は適用なし' : '対象外', '');
            }
            if (dis.kind !== 'none') {
                ded('障害者控除（' + disLabelFull + '）', douitsu ? disAmount : 0, douitsu && disAmount > 0,
                    douitsu ? dis.basis + '。同一生計配偶者のため適用（ご本人の所得制限なし）' : '同一生計配偶者（所得' + man(limit) + '以下）に該当しないため適用なし',
                    douitsu ? '扶養控除等（異動）申告書 C欄' : '');
            }
            if (douitsu && dis.kind === 'special') adjReasons.push('特別障害者である同一生計配偶者');
            notes.push('配偶者は扶養控除・特定親族特別控除の対象にはなりません（配偶者控除・配偶者特別控除で判定します）。内縁関係の方は対象外です。');
        } else {
            var fuyou = cat('fuyou', '扶養親族', !isExcluded && income <= limit,
                isExcluded ? excluded.join('、') : (income <= limit ? '合計所得金額 ' + yen(income) + '（' + man(limit) + '以下）、生計を一にする親族' : '合計所得金額 ' + yen(income) + ' が' + man(limit) + 'を超える'));
            var ageText = age == null ? '生年月日未入力' : rules.judgeDateLabel + '時点 ' + age + '歳';
            var under16 = fuyou && age != null && age < 16;
            cat('nensho', '年少扶養親族（16歳未満）', under16, fuyou ? ageText : '扶養親族に該当しない', '扶養控除等（異動）申告書「住民税に関する事項」');
            var koujoFuyou = cat('koujoFuyou', '控除対象扶養親族（16歳以上）', fuyou && age != null && age >= 16, fuyou ? ageText : '扶養親族に該当しない', '扶養控除等（異動）申告書 B欄');
            var tokutei = cat('tokutei', '特定扶養親族（19歳以上23歳未満）', koujoFuyou && age >= 19 && age < 23, koujoFuyou ? ageText : '控除対象扶養親族に該当しない');
            var roujinF = cat('roujinF', '老人扶養親族（70歳以上）', koujoFuyou && age >= 70, koujoFuyou ? ageText : '控除対象扶養親族に該当しない');
            var doukyo = cat('doukyo', '同居老親等', roujinF && p.relation === 'parent' && cohabiting,
                !roujinF ? '老人扶養親族に該当しない' : (p.relation !== 'parent' ? 'ご本人または配偶者の直系尊属（父母・祖父母）ではない' : (cohabiting ? '70歳以上の直系尊属と同居' : '別居のため同居老親等以外')));
            var tokuteiShinzoku = cat('tokuteiShinzoku', '特定親族（特定親族特別控除）', !isExcluded && age != null && age >= 19 && age < 23 && income > limit && income <= specRelMax,
                isExcluded ? excluded.join('、') : (age == null ? '生年月日未入力' : (age < 19 || age >= 23 ? ageText + '（19歳以上23歳未満ではない）' : (income <= limit ? '所得' + man(limit) + '以下のため扶養親族（特定扶養親族）に該当' : (income > specRelMax ? '合計所得金額が' + man(specRelMax) + 'を超える' : '合計所得金額 ' + yen(income) + '（' + man(limit) + '超' + man(specRelMax) + '以下）')))),
                '給与所得者の特定親族特別控除申告書');
            cat('gensenShinzoku', '源泉控除対象親族（扶養控除等申告書に記載）', koujoFuyou || (tokuteiShinzoku && income <= 1000000),
                koujoFuyou ? '控除対象扶養親族' : (tokuteiShinzoku ? (income <= 1000000 ? '所得100万円以下の特定親族' : '特定親族だが所得100万円超（年末調整時に特定親族特別控除申告書で申告）') : '該当なし'),
                '扶養控除等（異動）申告書 B欄');

            if (koujoFuyou) {
                var fAmt = doukyo ? rules.dependent.elderlyParent : roujinF ? rules.dependent.elderly : tokutei ? rules.dependent.specific : rules.dependent.general;
                var fLabel = doukyo ? '同居老親等' : roujinF ? '老人扶養親族' : tokutei ? '特定扶養親族' : '一般の控除対象扶養親族';
                ded('扶養控除（' + fLabel + '）', fAmt, true, ageText + '、合計所得金額 ' + yen(income), '扶養控除等（異動）申告書 B欄');
            } else {
                ded('扶養控除', 0, false, under16 ? '16歳未満のため扶養控除なし（住民税の非課税判定・所得金額調整控除・生命保険料控除の特例には影響）' : (fuyou ? '生年月日未入力' : '扶養親族に該当しない'), '');
            }
            if (tokuteiShinzoku) {
                var sAmt = lookup(rules.specificRelative, income);
                ded('特定親族特別控除', sAmt, sAmt > 0, ageText + '、合計所得金額 ' + yen(income), '特定親族特別控除申告書');
            } else {
                ded('特定親族特別控除', 0, false, categories.filter(function (c) { return c.key === 'tokuteiShinzoku'; })[0].reason, '');
            }
            if (dis.kind !== 'none') {
                ded('障害者控除（' + disLabelFull + '）', fuyou ? disAmount : 0, fuyou && disAmount > 0,
                    fuyou ? dis.basis + '。扶養親族のため適用（16歳未満でも可）' : '扶養親族（所得' + man(limit) + '以下）に該当しないため適用なし。特定親族には障害者控除はありません',
                    fuyou ? '扶養控除等（異動）申告書 C欄' : '');
            }
            if (fuyou && age != null && age < 23) {
                adjReasons.push('23歳未満の扶養親族');
                if (rules.lifeInsurance.generalNewCapWithYoungDependent) notes.push(rules.label + 'は、23歳未満の扶養親族がいる場合に一般生命保険料（新契約）の控除限度額が6万円に引き上げられます（保険料控除申告書に記載）。');
            }
            if (fuyou && dis.kind === 'special') adjReasons.push('特別障害者である扶養親族');
            if (fuyou && age != null && age < 16) notes.push('16歳未満の扶養親族は扶養控除等（異動）申告書の「住民税に関する事項」欄に記載します。');
        }
        if (adjReasons.length) {
            notes.unshift('所得金額調整控除（子ども等）：この方は要件「' + adjReasons.join('」「') + '」に該当します。' +
                (selfSalary > 8500000
                    ? 'ご本人の給与収入が850万円超のため対象です（控除額 ' + yen(Math.floor((Math.min(selfSalary, rules.incomeAdjustment.cap) - rules.incomeAdjustment.threshold) * rules.incomeAdjustment.rate)) + '、所得金額調整控除申告書の提出が必要）。'
                    : 'ご本人の給与収入が850万円を超える場合に最大15万円が給与所得から控除されます。'));
        }

        return {
            year: year, rules: rules, age: age, income: income, salary: toInt(p.salary),
            selfIncome: selfIncome, selfSalary: selfSalary,
            disability: { kind: dis.kind, label: disLabelFull, basis: dis.basis, pending: !!dis.pending, cohabiting: cohabiting },
            excluded: excluded, categories: categories, deductions: deductions, notes: notes,
            total: deductions.reduce(function (t, d) { return t + (d.applied ? d.amount : 0); }, 0)
        };
    }

    return {
        RULES: RULES,
        DISABILITY_HANDBOOKS: DISABILITY_HANDBOOKS,
        classifyDisability: classifyDisability,
        judgePerson: judgePerson,
        years: Object.keys(RULES).map(Number).sort(function (a, b) { return b - a; }),
        toInt: toInt,
        normalizeDigits: normalizeDigits,
        ageAtYearEnd: ageAtYearEnd,
        salaryIncome: salaryIncome,
        salaryDeductionAmount: salaryDeductionAmount,
        lifeNewFormula: lifeNewFormula,
        lifeOldFormula: lifeOldFormula,
        longTermFormula: longTermFormula,
        calculate: calculate,
        yen: yen,
        man: man
    };
});

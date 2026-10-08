/**
 * 年末調整 控除額チェッカー ― UI
 * 計算は js/nencho-rules.js（NenchoRules）に委ねる。
 */
(function () {
    'use strict';

    var R = window.NenchoRules;
    var app = document.getElementById('nencho-app');
    if (!R || !app) return;

    var STEPS = ['ご本人', '配偶者', '扶養親族', '保険料・掛金', '結果'];
    var man = R.man;
    function rules() { return R.RULES[state.year] || R.RULES[R.years[0]]; }
    var CURRENT_YEAR = new Date().getFullYear();

    // ------------------------------------------------------------------
    // 状態
    // ------------------------------------------------------------------
    function emptyBirth() { return { y: '', m: '', d: '' }; }

    function newDependent() {
        return {
            name: '', relation: 'child', birth: emptyBirth(),
            salary: '', otherIncome: '', cohabiting: true, disability: 'none'
        };
    }

    function initialState() {
        return {
            step: 0,
            year: R.years[0],
            self: {
                salary: '', otherIncome: '', disability: 'none',
                marital: 'married', commonLawSpouse: false, workingStudent: false
            },
            spouse: {
                birth: emptyBirth(), salary: '', otherIncome: '',
                disability: 'none', cohabiting: true
            },
            dependents: [],
            insurance: {
                social: '', mutual: '', lifeNew: '', lifeOld: '', care: '',
                pensionNew: '', pensionOld: '', quake: '', longTerm: ''
            },
            housingLoan: ''
        };
    }

    var state = initialState();

    // ------------------------------------------------------------------
    // ユーティリティ
    // ------------------------------------------------------------------
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function fmt(n) { return R.toInt(n).toLocaleString('ja-JP'); }

    function fmtInput(v) {
        var s = String(v == null ? '' : v).replace(/[^\d]/g, '');
        return s ? Number(s).toLocaleString('ja-JP') : '';
    }

    function manHint(v) {
        var n = R.toInt(v);
        if (!n) return '';
        var man = n / 10000;
        return '= ' + (Number.isInteger(man) ? man : man.toFixed(1)) + '万円';
    }

    function wareki(y) {
        if (y >= 2020) return '令和' + (y - 2018) + '年';
        if (y === 2019) return '平成31年／令和元年';
        if (y >= 1990) return '平成' + (y - 1988) + '年';
        if (y === 1989) return '昭和64年／平成元年';
        if (y >= 1927) return '昭和' + (y - 1925) + '年';
        if (y === 1926) return '大正15年／昭和元年';
        if (y >= 1913) return '大正' + (y - 1911) + '年';
        return '';
    }

    function getPath(obj, path) {
        return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
    }

    function setPath(obj, path, value) {
        var keys = path.split('.');
        var last = keys.pop();
        var target = keys.reduce(function (o, k) { return o[k]; }, obj);
        target[last] = value;
    }

    function birthToInput(b) {
        if (!b || !b.y || !b.m || !b.d) return null;
        return { y: Number(b.y), m: Number(b.m), d: Number(b.d) };
    }

    function isMarried() { return state.self.marital === 'married'; }

    function buildInput() {
        return {
            year: state.year,
            self: {
                salary: state.self.salary,
                otherIncome: state.self.otherIncome,
                disability: state.self.disability,
                marital: state.self.marital,
                commonLawSpouse: state.self.commonLawSpouse,
                workingStudent: state.self.workingStudent
            },
            spouse: isMarried() ? {
                birth: birthToInput(state.spouse.birth),
                salary: state.spouse.salary,
                otherIncome: state.spouse.otherIncome,
                disability: state.spouse.disability,
                cohabiting: state.spouse.cohabiting
            } : null,
            dependents: state.dependents.map(function (d) {
                return {
                    name: d.name, relation: d.relation, birth: birthToInput(d.birth),
                    salary: d.salary, otherIncome: d.otherIncome,
                    cohabiting: d.cohabiting, disability: d.disability
                };
            }),
            insurance: state.insurance,
            housingLoan: state.housingLoan
        };
    }

    // ------------------------------------------------------------------
    // 部品レンダラー
    // ------------------------------------------------------------------
    function moneyField(path, label, help, placeholder) {
        var v = getPath(state, path);
        return '<div class="nencho-field">' +
            '<label class="nencho-label" for="f-' + path.replace(/\./g, '-') + '">' + label +
            (help ? '<small>' + help + '</small>' : '') + '</label>' +
            '<div class="nencho-money">' +
            '<input class="nencho-input" type="text" inputmode="numeric" autocomplete="off" id="f-' + path.replace(/\./g, '-') + '" ' +
            'data-path="' + path + '" data-money="1" value="' + esc(fmtInput(v)) + '" placeholder="' + esc(placeholder || '0') + '">' +
            '<span class="unit">円</span></div>' +
            '<div class="nencho-money-hint" data-hint-for="' + path + '">' + manHint(v) + '</div>' +
            '</div>';
    }

    function dateField(path, label, help) {
        var b = getPath(state, path) || emptyBirth();
        var years = '';
        for (var y = CURRENT_YEAR; y >= 1915; y--) {
            years += '<option value="' + y + '"' + (String(b.y) === String(y) ? ' selected' : '') + '>' +
                y + '年（' + wareki(y) + '）</option>';
        }
        var months = '', days = '';
        for (var m = 1; m <= 12; m++) {
            months += '<option value="' + m + '"' + (String(b.m) === String(m) ? ' selected' : '') + '>' + m + '月</option>';
        }
        for (var d = 1; d <= 31; d++) {
            days += '<option value="' + d + '"' + (String(b.d) === String(d) ? ' selected' : '') + '>' + d + '日</option>';
        }
        return '<div class="nencho-field">' +
            '<span class="nencho-label">' + label + (help ? '<small>' + help + '</small>' : '') + '</span>' +
            '<div class="nencho-date">' +
            '<select class="nencho-select year" data-path="' + path + '.y" data-rerender="1" aria-label="生年"><option value="">年を選択</option>' + years + '</select>' +
            '<select class="nencho-select month" data-path="' + path + '.m" data-rerender="1" aria-label="月"><option value="">月</option>' + months + '</select>' +
            '<select class="nencho-select day" data-path="' + path + '.d" data-rerender="1" aria-label="日"><option value="">日</option>' + days + '</select>' +
            '</div></div>';
    }

    function choiceField(path, label, options, help) {
        var v = getPath(state, path);
        var name = 'c-' + path.replace(/\./g, '-');
        var html = '<div class="nencho-field"><span class="nencho-label">' + label +
            (help ? '<small>' + help + '</small>' : '') + '</span><div class="nencho-choices">';
        options.forEach(function (o) {
            html += '<label class="nencho-choice"><input type="radio" name="' + name + '" value="' + esc(o[0]) + '" ' +
                'data-path="' + path + '" data-rerender="1"' + (String(v) === String(o[0]) ? ' checked' : '') + '>' +
                '<span>' + esc(o[1]) + '</span></label>';
        });
        return html + '</div></div>';
    }

    function checkField(path, label, help) {
        var v = !!getPath(state, path);
        return '<div class="nencho-field"><label class="nencho-check">' +
            '<input type="checkbox" data-path="' + path + '" data-rerender="1"' + (v ? ' checked' : '') + '>' +
            '<span>' + label + (help ? '<small class="nencho-help">' + help + '</small>' : '') + '</span></label></div>';
    }

    var DISABILITY_OPTIONS = [['none', 'なし'], ['general', '一般の障害者'], ['special', '特別障害者']];

    function navButtons(backLabel, nextLabel) {
        return '<div class="nencho-nav">' +
            (backLabel ? '<button type="button" class="nencho-btn ghost" data-action="back">' + backLabel + '</button>' : '<span></span>') +
            '<button type="button" class="nencho-btn primary" data-action="next">' + nextLabel + '</button></div>';
    }

    function stepsIndicator() {
        var html = '<ol class="nencho-steps">';
        STEPS.forEach(function (label, i) {
            var cls = i < state.step ? 'is-done' : i === state.step ? 'is-active' : '';
            var skipped = (i === 1 && !isMarried());
            html += '<li class="nencho-step ' + cls + '" data-goto="' + i + '">' + label +
                (skipped && i < state.step ? '<br><span style="font-size:0.7em">（なし）</span>' : '') + '</li>';
        });
        return html + '</ol>';
    }

    // ------------------------------------------------------------------
    // 各ステップ
    // ------------------------------------------------------------------
    function renderSelf() {
        var yearOpts = R.years.map(function (y) {
            return '<option value="' + y + '"' + (Number(state.year) === y ? ' selected' : '') + '>' + R.RULES[y].label + '</option>';
        }).join('');
        return '<h3>ご本人について</h3>' +
            '<p class="nencho-lead">年末調整を受けるご本人（給与の支払いを受ける方）の情報を入力してください。</p>' +
            '<div class="nencho-field"><label class="nencho-label" for="f-year">対象年分</label>' +
            '<select class="nencho-select" id="f-year" data-path="year" data-rerender="1" style="max-width:260px">' + yearOpts + '</select></div>' +
            moneyField('self.salary', '給与収入（年収・額面）の見込み',
                '源泉徴収票の「支払金額」にあたる金額。賞与を含む1年分の総支給額で、手取りではありません。', '例：4,500,000') +
            moneyField('self.otherIncome', '給与以外の所得金額（あれば）',
                '副業・不動産などの「所得」（収入から経費を引いた後）。なければ空欄で結構です。') +
            choiceField('self.disability', 'ご本人の障害者区分', DISABILITY_OPTIONS,
                '特別障害者：身体障害者手帳1・2級、精神障害者保健福祉手帳1級、療育手帳A（重度）など') +
            choiceField('self.marital', '配偶者（結婚）の状況', [
                ['married', '配偶者がいる'], ['single', '未婚'], ['divorced', '離婚している'], ['widowed', '死別・生死不明']
            ], '令和' + (Number(state.year) - 2018) + '年12月31日時点の状況で選んでください。') +
            (isMarried() ? '' :
                checkField('self.commonLawSpouse', '事実婚（住民票に「未届の夫／妻」等の記載がある）の相手がいる',
                    'ひとり親控除・寡婦控除は、事実婚の相手がいる場合は受けられません。')) +
            checkField('self.workingStudent', '勤労学生（学校教育法の学校・専修学校等の学生・生徒）である',
                '合計所得金額' + man(rules().workingStudent.incomeLimit) + '以下（給与のみなら年収' + man(rules().salaryHints.workingStudent) + '以下）で給与以外の所得が10万円以下の場合に勤労学生控除の対象です。') +
            navButtons(null, isMarried() ? '次へ：配偶者について' : '次へ：扶養親族について');
    }

    function judgeBox(person) {
        if (!person) return '';
        var rl = rules();
        var html = '<div class="nencho-judge' + ((person.amount || person.specificRelativeAmount || person.isDouitsuSeikei) ? '' : ' is-muted') + '">';
        if (person.age != null) {
            html += rl.judgeDateLabel + '時点 <strong>' + person.age + '歳</strong>　';
        } else {
            html += '生年月日を入力すると年齢区分を判定します　';
        }
        html += '合計所得金額（見込み）<strong>' + fmt(person.income) + '円</strong>';
        if (person.role === 'spouse') {
            var lim = rl.dependentIncomeLimit;
            var spMax = rl.spouseSpecial[rl.spouseSpecial.length - 1][0];
            if (person.isDouitsuSeikei) {
                html += '<br>→ 配偶者控除の対象（所得' + man(lim) + '以下）' + (person.isElderly ? '／老人控除対象配偶者' : '');
            } else if (person.income <= spMax) {
                html += '<br>→ 配偶者特別控除の対象（所得' + man(lim) + '超' + man(spMax) + '以下）';
            } else {
                html += '<br>→ 所得' + man(spMax) + '超のため配偶者控除・配偶者特別控除は対象外';
            }
        } else {
            html += '<br>→ ' + esc(person.categoryLabel || '判定中');
            if (person.amount) html += '：扶養控除 <strong>' + fmt(person.amount) + '円</strong>';
            if (person.specificRelativeAmount) html += '：控除額 <strong>' + fmt(person.specificRelativeAmount) + '円</strong>';
            if (person.disabilityAmount) html += '　＋ 障害者控除 ' + fmt(person.disabilityAmount) + '円';
        }
        return html + '</div>';
    }

    function renderSpouse(result) {
        var sp = result.persons.filter(function (p) { return p.role === 'spouse'; })[0];
        return '<h3>配偶者について</h3>' +
            '<p class="nencho-lead">配偶者控除・配偶者特別控除は、配偶者の所得とご本人の所得の組み合わせで控除額が決まります。</p>' +
            dateField('spouse.birth', '配偶者の生年月日', '70歳以上（' + R.RULES[state.year].judgeDateLabel + '時点）だと「老人控除対象配偶者」として控除額が増えます。') +
            moneyField('spouse.salary', '配偶者の給与収入（年収・額面）の見込み', 'パート・アルバイト収入など。給与収入' + man(rules().salaryHints.dependent) + '以下なら所得' + man(rules().dependentIncomeLimit) + '以下となり配偶者控除の対象です。', '例：1,030,000') +
            moneyField('spouse.otherIncome', '配偶者の給与以外の所得金額（あれば）', '年金のみの場合の目安：65歳以上は年金収入－110万円、65歳未満は年金収入－60万円（マイナスなら0）。') +
            choiceField('spouse.disability', '配偶者の障害者区分', DISABILITY_OPTIONS) +
            (state.spouse.disability === 'special' ? checkField('spouse.cohabiting', 'ご本人または生計を一にする親族と同居している', '同居している特別障害者は「同居特別障害者」として控除額が75万円になります。') : '') +
            judgeBox(sp) +
            navButtons('戻る', '次へ：扶養親族について');
    }

    function renderDependents(result) {
        var html = '<h3>扶養親族について</h3>' +
            '<p class="nencho-lead">生計を一にするお子さん・ご両親などを追加してください（配偶者は除く）。16歳未満のお子さんも、障害者控除や所得金額調整控除の判定に使うため入力をおすすめします。' +
            '扶養親族の所得要件は合計所得金額' + man(rules().dependentIncomeLimit) + '以下（給与のみなら年収' + man(rules().salaryHints.dependent) + '以下）、' +
            '19〜22歳で所得' + man(rules().dependentIncomeLimit) + '超123万円以下（年収' + man(rules().salaryHints.specificRelativeMax) + '以下）なら特定親族特別控除の対象です。</p>';
        if (!state.dependents.length) {
            html += '<p class="nencho-empty">扶養親族がいない場合は、そのまま「次へ」に進んでください。</p>';
        }
        state.dependents.forEach(function (d, i) {
            var base = 'dependents.' + i;
            var person = result.persons.filter(function (p) { return p.role === 'dependent' && p.index === i; })[0];
            html += '<div class="nencho-person">' +
                '<div class="nencho-person-head"><h4>扶養親族 ' + (i + 1) + '</h4>' +
                '<button type="button" class="nencho-remove" data-action="remove" data-index="' + i + '">削除</button></div>' +
                '<div class="nencho-grid">' +
                '<div class="nencho-field"><label class="nencho-label" for="f-' + base + '-name">呼び名（任意）</label>' +
                '<input class="nencho-input" type="text" id="f-' + base + '-name" data-path="' + base + '.name" value="' + esc(d.name) + '" placeholder="例：長男、母" maxlength="20"></div>' +
                '<div class="nencho-field"><label class="nencho-label" for="f-' + base + '-rel">続柄</label>' +
                '<select class="nencho-select" id="f-' + base + '-rel" data-path="' + base + '.relation" data-rerender="1">' +
                '<option value="child"' + (d.relation === 'child' ? ' selected' : '') + '>子</option>' +
                '<option value="parent"' + (d.relation === 'parent' ? ' selected' : '') + '>父母・祖父母（ご本人または配偶者の）</option>' +
                '<option value="other"' + (d.relation === 'other' ? ' selected' : '') + '>その他の親族（兄弟姉妹など）</option>' +
                '</select></div>' +
                '<div class="span-2">' + dateField(base + '.birth', '生年月日') + '</div>' +
                moneyField(base + '.salary', '給与収入（年収・額面）の見込み', 'アルバイト収入など。なければ空欄。') +
                moneyField(base + '.otherIncome', '給与以外の所得金額（あれば）', '年金のみの目安：65歳以上は年金収入－110万円、65歳未満は－60万円。') +
                '<div class="span-2">' + choiceField(base + '.disability', '障害者区分', DISABILITY_OPTIONS) + '</div>' +
                '<div class="span-2">' + checkField(base + '.cohabiting', '同居している（ご本人または配偶者と）',
                    d.relation === 'parent' ? '70歳以上の父母・祖父母と同居している場合は「同居老親等」として控除額が58万円になります。' :
                        (d.disability === 'special' ? '同居している特別障害者は「同居特別障害者」として75万円になります。' : '')) + '</div>' +
                '</div>' + judgeBox(person) + '</div>';
        });
        html += '<button type="button" class="nencho-add" data-action="add">扶養親族を追加する</button>';
        return html + navButtons('戻る', '次へ：保険料・掛金について');
    }

    function renderInsurance(result) {
        var rules = R.RULES[state.year];
        var lifeItem = result.items.filter(function (i) { return i.key === 'life'; })[0];
        var tokurei = lifeItem && lifeItem.detail && lifeItem.detail.generalNewCap > rules.lifeInsurance.newCap;
        return '<h3>保険料・掛金など</h3>' +
            '<p class="nencho-lead">お手元の控除証明書の金額（1年間の支払見込額）を入力してください。該当がない項目は空欄のままで結構です。</p>' +
            '<h4 class="nencho-result-title">社会保険料・共済掛金</h4>' +
            moneyField('insurance.social', '社会保険料（ご自身で支払った分）', '国民年金・国民健康保険など。給与から天引きされている分は会社側で集計されるため、ここには含めません。') +
            moneyField('insurance.mutual', '小規模企業共済等掛金（iDeCo など）', 'iDeCo（個人型確定拠出年金）・小規模企業共済・心身障害者扶養共済の掛金。') +
            '<h4 class="nencho-result-title">生命保険料</h4>' +
            (tokurei ? '<p class="nencho-help" style="margin-bottom:10px;color:#b36b00">23歳未満の扶養親族がいるため、' + rules.label + 'は一般生命保険料（新制度）の控除限度額が6万円に引き上げられます（合計の上限12万円は変わりません）。</p>' : '') +
            '<div class="nencho-grid">' +
            moneyField('insurance.lifeNew', '一般の生命保険料（新制度）', '平成24年1月1日以後の契約。証明書に「新」「新制度」と記載。') +
            moneyField('insurance.lifeOld', '一般の生命保険料（旧制度）', '平成23年12月31日以前の契約。') +
            moneyField('insurance.care', '介護医療保険料', '新制度のみ。') +
            moneyField('insurance.pensionNew', '個人年金保険料（新制度）') +
            moneyField('insurance.pensionOld', '個人年金保険料（旧制度）') +
            '</div>' +
            '<h4 class="nencho-result-title">地震保険料</h4>' +
            '<div class="nencho-grid">' +
            moneyField('insurance.quake', '地震保険料') +
            moneyField('insurance.longTerm', '旧長期損害保険料', '平成18年末までに契約した満期返戻金のある長期損害保険。') +
            '</div>' +
            '<h4 class="nencho-result-title">住宅ローン控除（2年目以降の方）</h4>' +
            moneyField('housingLoan', '住宅借入金等特別控除額', '税務署から届いた「年末調整のための住宅借入金等特別控除証明書」で計算した控除額。所得控除ではなく税額から差し引かれます（1年目は確定申告が必要）。') +
            navButtons('戻る', '結果を見る');
    }

    function renderResult(result) {
        var s = result.self;
        var t = result.totals;
        var rules = result.rules;
        var html = '<h3>判定結果（' + rules.label + '）</h3>' +
            '<p class="nencho-lead">入力内容から、年末調整で適用される控除とその金額をまとめました。</p>' +
            '<div class="nencho-total"><div class="caption">所得控除の合計額</div>' +
            '<div class="amount">' + fmt(t.deductions) + '<small>円</small></div>' +
            '<div class="sub">合計所得金額 ' + fmt(s.totalIncome) + '円 から差し引かれます</div></div>';

        // 所得の計算
        html += '<h4 class="nencho-result-title">所得金額の計算</h4><table class="nencho-table">' +
            '<tr><td>給与収入（額面）</td><td class="num">' + fmt(s.salary) + '円</td></tr>' +
            '<tr><td>給与所得控除額</td><td class="num">△ ' + fmt(s.salaryDeduction) + '円</td></tr>';
        if (s.incomeAdjustment > 0) {
            html += '<tr><td>所得金額調整控除<br><small style="color:#777">' + esc(s.incomeAdjustmentReason) + '</small></td><td class="num">△ ' + fmt(s.incomeAdjustment) + '円</td></tr>';
        } else if (s.incomeAdjustmentReason) {
            html += '<tr><td>所得金額調整控除<br><small style="color:#777">' + esc(s.incomeAdjustmentReason) + '</small></td><td class="num">0円</td></tr>';
        }
        html += '<tr><td>給与所得</td><td class="num">' + fmt(s.salaryIncome) + '円</td></tr>';
        if (s.otherIncome > 0) {
            html += '<tr><td>給与以外の所得</td><td class="num">' + fmt(s.otherIncome) + '円</td></tr>';
        }
        html += '<tr class="total"><td>合計所得金額（見込み）</td><td class="num">' + fmt(s.totalIncome) + '円</td></tr></table>';

        // 控除一覧
        var applied = result.items.filter(function (i) { return i.applied; });
        var notApplied = result.items.filter(function (i) { return !i.applied; });
        html += '<h4 class="nencho-result-title">適用される所得控除</h4><div class="nencho-items">';
        if (!applied.length) html += '<p class="nencho-empty">適用される控除がありません。</p>';
        applied.forEach(function (it) {
            html += '<div class="nencho-item"><div class="name">' + esc(it.name) + '</div>' +
                '<div class="amt">' + fmt(it.amount) + '円</div>' +
                (it.note ? '<div class="note">' + esc(it.note) + '</div>' : '') + '</div>';
        });
        html += '</div>';
        if (notApplied.length) {
            html += '<h4 class="nencho-result-title">対象外・未入力の控除</h4><div class="nencho-items">';
            notApplied.forEach(function (it) {
                html += '<div class="nencho-item is-off"><div class="name">' + esc(it.name) + '</div>' +
                    '<div class="amt">—</div>' +
                    (it.note ? '<div class="note">' + esc(it.note) + '</div>' : '') + '</div>';
            });
            html += '</div>';
        }

        // 税額の参考
        html += '<h4 class="nencho-result-title">参考：所得税額の概算</h4><div class="nencho-ref"><table class="nencho-table">' +
            '<tr><td>合計所得金額</td><td class="num">' + fmt(s.totalIncome) + '円</td></tr>' +
            '<tr><td>所得控除の合計</td><td class="num">△ ' + fmt(t.deductions) + '円</td></tr>' +
            '<tr><td>課税所得金額（千円未満切捨て）</td><td class="num">' + fmt(t.taxable) + '円</td></tr>' +
            '<tr><td>算出所得税額</td><td class="num">' + fmt(t.baseTax) + '円</td></tr>' +
            (t.housingLoan > 0 ? '<tr><td>住宅借入金等特別控除</td><td class="num">△ ' + fmt(Math.min(t.housingLoan, t.baseTax)) + '円</td></tr>' : '') +
            '<tr class="total"><td>年税額の目安（復興特別所得税2.1%込・百円未満切捨て）</td><td class="num">' + fmt(t.estimatedTax) + '円</td></tr>' +
            '</table><p class="nencho-help" style="margin-top:8px">毎月の給与・賞与から源泉徴収された所得税の合計がこの金額より多ければ還付、少なければ追加徴収となる見込みです。</p></div>';

        html += '<div class="nencho-note"><strong>ご利用上の注意</strong><ul>' +
            '<li>このチェッカーは所得税の年末調整で適用される控除の<strong>確認用の概算</strong>です。実際の控除額は、勤務先に提出する各申告書の記載内容と証明書に基づいて確定します。</li>' +
            '<li>収入・所得は年末時点の見込額で判定しています。見込みと実績が変わると控除額も変わることがあります。</li>' +
            '<li>国外に居住する親族、青色事業専従者・事業専従者、他の方の扶養親族や同一生計配偶者になっている方など、特殊なケースは考慮していません。</li>' +
            '<li>医療費控除・寄附金控除（ふるさと納税のワンストップ特例を除く）・雑損控除、住宅ローン控除の1年目は年末調整では受けられないため確定申告が必要です。</li>' +
            '</ul></div>';

        html += '<div class="nencho-nav">' +
            '<button type="button" class="nencho-btn ghost" data-action="back">入力内容を修正する</button>' +
            '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
            '<button type="button" class="nencho-btn text" data-action="reset">最初からやり直す</button>' +
            '<button type="button" class="nencho-btn primary" data-action="print">印刷・PDF保存</button>' +
            '</div></div>';
        return html;
    }

    // ------------------------------------------------------------------
    // 描画
    // ------------------------------------------------------------------
    function render() {
        var result = R.calculate(buildInput());
        var panel;
        switch (state.step) {
            case 0: panel = renderSelf(); break;
            case 1: panel = renderSpouse(result); break;
            case 2: panel = renderDependents(result); break;
            case 3: panel = renderInsurance(result); break;
            default: panel = renderResult(result);
        }
        app.innerHTML = stepsIndicator() + '<div class="nencho-panel">' + panel + '</div>';
    }

    function goTo(step) {
        state.step = Math.max(0, Math.min(STEPS.length - 1, step));
        render();
        var top = app.getBoundingClientRect().top + window.pageYOffset - 90;
        window.scrollTo({ top: top, behavior: 'smooth' });
    }

    function next() {
        var s = state.step + 1;
        if (s === 1 && !isMarried()) s = 2;
        goTo(s);
    }

    function back() {
        var s = state.step - 1;
        if (state.step === 4) s = 0;
        if (s === 1 && !isMarried()) s = 0;
        goTo(s);
    }

    // ------------------------------------------------------------------
    // イベント
    // ------------------------------------------------------------------
    function readValue(el) {
        if (el.type === 'checkbox') return el.checked;
        if (el.getAttribute('data-money')) return String(el.value).replace(/[^\d]/g, '');
        return el.value;
    }

    app.addEventListener('input', function (e) {
        var el = e.target;
        var path = el.getAttribute('data-path');
        if (!path || el.tagName === 'SELECT' || el.type === 'radio' || el.type === 'checkbox') return;
        setPath(state, path, readValue(el));
        if (el.getAttribute('data-money')) {
            var hint = app.querySelector('[data-hint-for="' + path + '"]');
            if (hint) hint.textContent = manHint(el.value);
        }
    });

    app.addEventListener('change', function (e) {
        var el = e.target;
        var path = el.getAttribute('data-path');
        if (!path) return;
        setPath(state, path, readValue(el));
        if (el.getAttribute('data-money')) {
            el.value = fmtInput(el.value);
            // 金額の変更は判定表示に影響するので、人物カード等の表示を更新
            if (state.step === 1 || state.step === 2 || state.step === 3) {
                var active = document.activeElement;
                var id = active && active.id;
                render();
                // フォーカス中の要素が残っていれば復元しない（blur 後なので不要）
                void id;
            }
            return;
        }
        if (el.getAttribute('data-rerender')) render();
    });

    app.addEventListener('focusout', function (e) {
        var el = e.target;
        if (el.getAttribute && el.getAttribute('data-money')) el.value = fmtInput(el.value);
    });

    app.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-action]');
        if (btn) {
            var action = btn.getAttribute('data-action');
            if (action === 'next') next();
            else if (action === 'back') back();
            else if (action === 'add') { state.dependents.push(newDependent()); render(); }
            else if (action === 'remove') {
                state.dependents.splice(Number(btn.getAttribute('data-index')), 1);
                render();
            }
            else if (action === 'print') window.print();
            else if (action === 'reset') {
                if (window.confirm('入力内容をすべて消去して最初からやり直しますか？')) {
                    state = initialState();
                    goTo(0);
                }
            }
            return;
        }
        var stepEl = e.target.closest('.nencho-step.is-done');
        if (stepEl) {
            var target = Number(stepEl.getAttribute('data-goto'));
            if (target === 1 && !isMarried()) target = 0;
            goTo(target);
        }
    });

    app.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type === 'text') {
            e.preventDefault();
            e.target.blur();
        }
    });

    var ver = document.getElementById("app-version");
    if (ver) ver.textContent = "対応年分：" + R.years.map(function (y) { return R.RULES[y].label; }).join("・");

    render();
})();

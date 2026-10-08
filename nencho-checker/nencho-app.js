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
            salary: '', otherIncome: '', cohabiting: true, handbook: 'none', grade: ''
        };
    }

    function initialPerson() {
        return {
            self: { salary: '', otherIncome: '' },
            person: {
                relation: 'spouse', birth: emptyBirth(), salary: '', otherIncome: '',
                cohabiting: true, handbook: 'none', grade: '', businessEmployee: false, claimedByOther: false
            }
        };
    }

    function initialState() {
        return {
            view: 'household',
            step: 0,
            year: R.years[0],
            personTab: initialPerson(),
            self: {
                salary: '', otherIncome: '', handbook: 'none', grade: '',
                marital: 'married', commonLawSpouse: false, workingStudent: false
            },
            spouse: {
                birth: emptyBirth(), salary: '', otherIncome: '',
                handbook: 'none', grade: '', cohabiting: true
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
        var s = R.normalizeDigits(v).replace(/[^\d]/g, '');
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
        if (!b || !b.y) return null;
        return { y: Number(b.y), m: Number(b.m) || 0, d: Number(b.d) || 0 };
    }

    function isMarried() { return state.self.marital === 'married'; }

    function disKind(obj) { return R.classifyDisability(obj.handbook, obj.grade).kind; }

    function buildInput() {
        return {
            year: state.year,
            self: {
                salary: state.self.salary,
                otherIncome: state.self.otherIncome,
                disability: disKind(state.self),
                marital: state.self.marital,
                commonLawSpouse: state.self.commonLawSpouse,
                workingStudent: state.self.workingStudent
            },
            spouse: isMarried() ? {
                birth: birthToInput(state.spouse.birth),
                salary: state.spouse.salary,
                otherIncome: state.spouse.otherIncome,
                disability: disKind(state.spouse),
                cohabiting: state.spouse.cohabiting
            } : null,
            dependents: state.dependents.map(function (d) {
                return {
                    name: d.name, relation: d.relation, birth: birthToInput(d.birth),
                    salary: d.salary, otherIncome: d.otherIncome,
                    cohabiting: d.cohabiting, disability: disKind(d)
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
        var isJan = String(b.m) === '1';
        var dayDisabled = !isJan;
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
            days += '<option value="' + d + '"' + (isJan && String(b.d) === String(d) ? ' selected' : '') + '>' + d + '日</option>';
        }
        var msg = '';
        if (b.y && R.birthNeedsDay(b)) {
            msg = '<div class="nencho-date-warn">1月生まれは「1日」かどうかで' + R.RULES[state.year].judgeDateLabel + '時点の年齢が1歳変わります。日を入力してください（未入力の間は1月2日以降生まれとして判定）。</div>';
        } else if (b.y && !b.m) {
            msg = '<div class="nencho-date-note">年だけで判定できます。1月1日生まれの方のみ、月（1月）と日（1日）も選んでください。</div>';
        } else if (b.y && isJan && String(b.d) === '1') {
            msg = '<div class="nencho-date-note">1月1日生まれのため、' + R.RULES[state.year].judgeDateLabel + 'に1つ上の年齢として判定します。</div>';
        }
        var age = R.ageAtYearEnd(birthToInput(b), Number(state.year));
        var ageBadge = age != null
            ? '<span class="nencho-age-badge" title="' + R.RULES[state.year].judgeDateLabel + '時点">→ ' + age + '歳<small>' + R.RULES[state.year].judgeDateLabel + '時点</small></span>'
            : '';
        return '<div class="nencho-field">' +
            '<span class="nencho-label">' + label + (help ? '<small>' + help + '</small>' : '') + '</span>' +
            '<div class="nencho-date">' +
            '<select class="nencho-select year" data-path="' + path + '.y" data-rerender="1" aria-label="生年"><option value="">年を選択</option>' + years + '</select>' +
            '<select class="nencho-select month" data-path="' + path + '.m" data-rerender="1" aria-label="月（任意）"><option value="">月（任意）</option>' + months + '</select>' +
            '<select class="nencho-select day' + (dayDisabled ? ' is-disabled' : '') + '" data-path="' + path + '.d" data-rerender="1" aria-label="日（1月生まれのみ）"' +
            (dayDisabled ? ' disabled title="1月生まれの場合のみ入力します"' : '') + '><option value="">日</option>' + days + '</select>' +
            ageBadge +
            '</div>' + msg + '</div>';
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

    /**
     * 障害者手帳・認定の選択 + 区分判定の即時表示
     * base … 'self' / 'spouse' / 'dependents.0' / 'personTab.person'
     * opts.cohabitingPath … 同居チェックのパス（指定時は同居特別障害者の判定も表示）
     */
    function disabilityField(base, label, opts) {
        opts = opts || {};
        var obj = getPath(state, base) || {};
        var hb = R.DISABILITY_HANDBOOKS.filter(function (h) { return h.key === obj.handbook; })[0];
        var hbOpts = R.DISABILITY_HANDBOOKS.map(function (h) {
            return '<option value="' + h.key + '"' + (obj.handbook === h.key ? ' selected' : '') + '>' + esc(h.label) + '</option>';
        }).join('');
        var id = 'f-' + base.replace(/\./g, '-') + '-handbook';
        var html = '<div class="nencho-field"><label class="nencho-label" for="' + id + '">' + label +
            '<small>手帳・認定の種類と等級から、所得税法上の「一般の障害者」「特別障害者」を判定します。</small></label>' +
            '<select class="nencho-select" id="' + id + '" data-path="' + base + '.handbook" data-rerender="1">' + hbOpts + '</select>';
        if (hb && hb.grades) {
            html += '<div class="nencho-choices" style="margin-top:10px">';
            hb.grades.forEach(function (g) {
                html += '<label class="nencho-choice"><input type="radio" name="c-' + base.replace(/\./g, '-') + '-grade" value="' + esc(g.v) + '" data-path="' + base + '.grade" data-rerender="1"' +
                    (String(obj.grade) === String(g.v) ? ' checked' : '') + '><span>' + esc(g.label) + '</span></label>';
            });
            html += '</div>';
        }
        var dis = R.classifyDisability(obj.handbook, obj.grade);
        if (obj.handbook && obj.handbook !== 'none') {
            if (dis.pending) {
                html += '<div class="nencho-date-warn">等級・区分を選択すると判定します。</div>';
            } else {
                var cohab = opts.cohabitingPath ? !!getPath(state, opts.cohabitingPath) : null;
                var text = '判定：<strong>' + esc(dis.label) + '</strong>（' + esc(dis.basis) + '）';
                if (dis.kind === 'special' && cohab !== null) {
                    text += cohab ? ' → 同居のため<strong>同居特別障害者</strong>（控除額75万円）' : ' → 別居のため特別障害者（控除額40万円）';
                } else if (dis.kind === 'special') {
                    text += '（控除額40万円）';
                } else {
                    text += '（控除額27万円）';
                }
                html += '<div class="nencho-dis-judge' + (dis.kind === 'special' ? ' is-special' : '') + '">' + text + '</div>';
            }
        }
        return html + '</div>';
    }

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
            disabilityField('self', 'ご本人の障害者手帳・認定') +
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
            (disKind(state.spouse) === 'special' ? checkField('spouse.cohabiting', 'ご本人または生計を一にする親族と同居している', '同居している特別障害者は「同居特別障害者」として控除額が75万円になります。') : '') +
            disabilityField('spouse', '配偶者の障害者手帳・認定', { cohabitingPath: 'spouse.cohabiting' }) +
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
                '<div class="span-2">' + checkField(base + '.cohabiting', '同居している（ご本人または配偶者と）',
                    d.relation === 'parent' ? '70歳以上の父母・祖父母と同居している場合は「同居老親等」として控除額が58万円になります。' :
                        (disKind(d) === 'special' ? '同居している特別障害者は「同居特別障害者」として75万円になります。' : '')) + '</div>' +
                '<div class="span-2">' + disabilityField(base, '障害者手帳・認定', { cohabitingPath: base + '.cohabiting' }) + '</div>' +
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
            (state.confirmReset
                ? '<span class="nencho-confirm">入力内容をすべて消去しますか？ ' +
                  '<button type="button" class="nencho-btn danger" data-action="reset-confirm">はい、消去する</button>' +
                  '<button type="button" class="nencho-btn text" data-action="reset-cancel">キャンセル</button></span>'
                : '<button type="button" class="nencho-btn text" data-action="reset">最初からやり直す</button>') +
            '<button type="button" class="nencho-btn primary" data-action="print">印刷・PDF保存</button>' +
            '</div></div>';
        return html;
    }

    // ------------------------------------------------------------------
    // 描画
    // ------------------------------------------------------------------
    function tabBar() {
        return '<div class="nencho-tabs" role="tablist">' +
            '<button type="button" role="tab" class="nencho-tab' + (state.view === 'household' ? ' is-active' : '') + '" data-view="household" aria-selected="' + (state.view === 'household') + '">世帯の控除額チェッカー<small>本人・家族・保険料をまとめて計算</small></button>' +
            '<button type="button" role="tab" class="nencho-tab' + (state.view === 'person' ? ' is-active' : '') + '" data-view="person" aria-selected="' + (state.view === 'person') + '">家族一人ひとりの判定<small>この人は何に該当し、控除はいくらか</small></button>' +
            '</div>';
    }

    // ---------------- 家族一人ひとりの判定 ----------------
    function personInput() {
        var pt = state.personTab;
        return {
            year: state.year,
            self: pt.self,
            person: {
                relation: pt.person.relation, birth: birthToInput(pt.person.birth),
                salary: pt.person.salary, otherIncome: pt.person.otherIncome,
                cohabiting: pt.person.cohabiting, handbook: pt.person.handbook, grade: pt.person.grade,
                businessEmployee: pt.person.businessEmployee, claimedByOther: pt.person.claimedByOther
            }
        };
    }

    function renderPersonForm() {
        var pt = state.personTab;
        var isSpouse = pt.person.relation === 'spouse';
        var yearOpts = R.years.map(function (y) {
            return '<option value="' + y + '"' + (Number(state.year) === y ? ' selected' : '') + '>' + R.RULES[y].label + '</option>';
        }).join('');
        var html = '<h3>判定する家族の情報</h3>' +
            '<p class="nencho-lead">配偶者・お子さん・ご両親など、1人分を入力すると右側（スマホでは下）に判定が表示されます。</p>' +
            '<div class="nencho-field"><label class="nencho-label" for="f-year2">対象年分</label>' +
            '<select class="nencho-select" id="f-year2" data-path="year" data-rerender="1" style="max-width:260px">' + yearOpts + '</select></div>' +
            choiceField('personTab.person.relation', 'ご本人との続柄', [
                ['spouse', '配偶者'], ['child', '子'], ['parent', '父母・祖父母'], ['other', 'その他の親族']
            ], isSpouse ? '民法上の配偶者（内縁関係は対象外）' : '6親等内の血族・3親等内の姻族、里子・養護を委託された老人を含みます。') +
            dateField('personTab.person.birth', '生年月日', '年齢は' + R.RULES[state.year].judgeDateLabel + '時点で判定します。') +
            moneyField('personTab.person.salary', 'この方の給与収入（年収・額面）の見込み', 'パート・アルバイト収入など。なければ空欄。') +
            moneyField('personTab.person.otherIncome', 'この方の給与以外の所得金額（あれば）', '年金のみの目安：65歳以上は年金収入－110万円、65歳未満は年金収入－60万円（マイナスなら0）。') +
            checkField('personTab.person.cohabiting', 'ご本人（または配偶者・生計を一にする親族）と同居している',
                '同居老親等・同居特別障害者の判定に使います。病気の治療のための入院は同居扱い、老人ホーム等への入所は別居扱いです。') +
            disabilityField('personTab.person', '障害者手帳・認定の種類', { cohabitingPath: 'personTab.person.cohabiting' });
        html += checkField('personTab.person.businessEmployee', '青色事業専従者として給与を受けている／白色事業専従者である', '該当する場合は配偶者控除・扶養控除等の対象外です。') +
            checkField('personTab.person.claimedByOther', '他の人の同一生計配偶者・扶養親族として申告されている', '同じ人を2人以上で重複して控除することはできません。') +
            '<h4 class="nencho-result-title">ご本人（控除を受ける方）の収入</h4>' +
            moneyField('personTab.self.salary', 'ご本人の給与収入（年収・額面）の見込み', '配偶者控除の控除額と、所得制限（900万・950万・1,000万円）の判定に使います。', '例：5,000,000') +
            moneyField('personTab.self.otherIncome', 'ご本人の給与以外の所得金額（あれば）');
        return html;
    }

    function renderPersonResult() {
        var res = R.judgePerson(personInput());
        var pt = state.personTab;
        var html = '<h3>判定結果（' + res.rules.label + '）</h3>';
        html += '<div class="nencho-total compact"><div class="caption">この方に関して受けられる控除の合計</div>' +
            '<div class="amount">' + fmt(res.total) + '<small>円</small></div>' +
            '<div class="sub">' + (res.age != null ? res.rules.judgeDateLabel + '時点 ' + res.age + '歳　' : '生年月日を入力してください　') +
            'この方の合計所得金額 ' + fmt(res.income) + '円　／　ご本人の合計所得金額 ' + fmt(res.selfIncome) + '円</div></div>';

        if (res.excluded.length) {
            html += '<div class="nencho-note" style="margin-top:0"><strong>対象外の理由：</strong>' + esc(res.excluded.join('、')) + '</div>';
        }

        html += '<h4 class="nencho-result-title">該当する区分</h4><ul class="nencho-cats">';
        res.categories.forEach(function (c) {
            html += '<li class="nencho-cat' + (c.ok ? ' is-ok' : '') + '"><span class="mark">' + (c.ok ? '✓' : '－') + '</span>' +
                '<div><div class="cat-label">' + esc(c.label) + '</div>' +
                (c.reason ? '<div class="cat-reason">' + esc(c.reason) + '</div>' : '') +
                (c.ok && c.form ? '<div class="cat-form">記載：' + esc(c.form) + '</div>' : '') + '</div></li>';
        });
        html += '</ul>';

        html += '<h4 class="nencho-result-title">障害者区分</h4>';
        if (res.disability.kind === 'none') {
            html += '<p class="nencho-help">' + (res.disability.pending ? esc(res.disability.basis) + ' の等級・区分を選択してください。' : '障害者控除の対象ではありません。') + '</p>';
        } else {
            html += '<div class="nencho-judge"><strong>' + esc(res.disability.label) + '</strong>（' + esc(res.disability.basis) + '）' +
                (res.disability.kind === 'special' ? '<br>' + (res.disability.cohabiting ? '同居しているため「同居特別障害者」として75万円' : '別居のため「特別障害者」として40万円') : '<br>一般の障害者として27万円') +
                '。ただし、控除を受けられるのは' + (pt.person.relation === 'spouse' ? '同一生計配偶者' : '扶養親族') + 'に該当する場合に限ります。</div>';
        }

        html += '<h4 class="nencho-result-title">控除額</h4><div class="nencho-items">';
        res.deductions.forEach(function (d) {
            html += '<div class="nencho-item' + (d.applied ? '' : ' is-off') + '"><div class="name">' + esc(d.name) + '</div>' +
                '<div class="amt">' + (d.applied ? fmt(d.amount) + '円' : '—') + '</div>' +
                '<div class="note">' + esc(d.note) + (d.applied && d.form ? '　【' + esc(d.form) + '】' : '') + '</div></div>';
        });
        html += '</div>';

        if (res.notes.length) {
            html += '<h4 class="nencho-result-title">関連する注意点</h4><ul class="nencho-notes">';
            res.notes.forEach(function (n) { html += '<li>' + esc(n) + '</li>'; });
            html += '</ul>';
        }
        return html;
    }

    function renderPersonView() {
        return '<div class="nencho-person-layout">' +
            '<div class="nencho-panel">' + renderPersonForm() + '</div>' +
            '<div class="nencho-panel" id="person-result">' + renderPersonResult() + '</div>' +
            '</div>';
    }

    function render() {
        if (state.view === 'person') {
            app.innerHTML = tabBar() + renderPersonView();
            return;
        }
        var result = R.calculate(buildInput());
        var panel;
        switch (state.step) {
            case 0: panel = renderSelf(); break;
            case 1: panel = renderSpouse(result); break;
            case 2: panel = renderDependents(result); break;
            case 3: panel = renderInsurance(result); break;
            default: panel = renderResult(result);
        }
        app.innerHTML = tabBar() + stepsIndicator() + '<div class="nencho-panel">' + panel + '</div>';
    }

    function refreshPersonResult() {
        var box = document.getElementById('person-result');
        if (box) box.innerHTML = renderPersonResult();
    }

    function goTo(step) {
        state.confirmReset = false;
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
        if (el.getAttribute('data-money')) return R.normalizeDigits(el.value).replace(/[^\d]/g, '');
        return el.value;
    }

    app.addEventListener('input', function (e) {
        var el = e.target;
        if (e.isComposing) return; // IME変換中は確定を待つ
        var path = el.getAttribute('data-path');
        if (!path || el.tagName === 'SELECT' || el.type === 'radio' || el.type === 'checkbox') return;
        setPath(state, path, readValue(el));
        if (el.getAttribute('data-money')) {
            var hint = app.querySelector('[data-hint-for="' + path + '"]');
            if (hint) hint.textContent = manHint(el.value);
        }
        if (state.view === 'person') refreshPersonResult();
    });

    app.addEventListener('change', function (e) {
        var el = e.target;
        var path = el.getAttribute('data-path');
        if (!path) return;
        setPath(state, path, readValue(el));
        if (el.getAttribute('data-money')) {
            el.value = fmtInput(el.value);
            if (state.view === 'person') { refreshPersonResult(); return; }
            // 金額の変更は判定表示に影響するので、人物カード等の表示を更新
            if (state.step === 1 || state.step === 2 || state.step === 3) render();
            return;
        }
        if (/\.handbook$/.test(path)) setPath(state, path.replace(/\.handbook$/, '.grade'), '');
        if (/\.birth\.m$/.test(path) && String(readValue(el)) !== '1') setPath(state, path.replace(/\.m$/, '.d'), '');
        if (el.getAttribute('data-rerender')) render();
    });

    app.addEventListener('compositionend', function (e) {
        var el = e.target;
        var path = el.getAttribute && el.getAttribute('data-path');
        if (!path || !el.getAttribute('data-money')) return;
        var digits = R.normalizeDigits(el.value).replace(/[^\d]/g, '');
        el.value = digits;
        setPath(state, path, digits);
        var hint = app.querySelector('[data-hint-for="' + path + '"]');
        if (hint) hint.textContent = manHint(digits);
        if (state.view === 'person') refreshPersonResult();
    });

    app.addEventListener('focusout', function (e) {
        var el = e.target;
        if (el.getAttribute && el.getAttribute('data-money')) el.value = fmtInput(el.value);
    });

    app.addEventListener('click', function (e) {
        var tab = e.target.closest('[data-view]');
        if (tab) {
            state.view = tab.getAttribute('data-view');
            state.confirmReset = false;
            render();
            return;
        }
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
            else if (action === 'reset') { state.confirmReset = true; render(); }
            else if (action === 'reset-cancel') { state.confirmReset = false; render(); }
            else if (action === 'reset-confirm') { state = initialState(); goTo(0); }
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
        // 日本語IMEの変換確定Enter（isComposing / keyCode 229）は無視する
        if (e.isComposing || e.keyCode === 229) return;
        if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type === 'text') {
            e.preventDefault();
            e.target.blur();
        }
    });

    var ver = document.getElementById("app-version");
    if (ver) ver.textContent = "対応年分：" + R.years.map(function (y) { return R.RULES[y].label; }).join("・");

    render();
})();

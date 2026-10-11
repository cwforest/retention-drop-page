// 페이지는 계산을 하지 않음. scripts/build_web_data.py 가 만들어 둔 JSON 을 읽어 그리기만 함.
'use strict';

const DATA = 'web/data/';
const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

async function 읽기(이름) {
  try {
    const r = await fetch(DATA + 이름, { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  }
}

// Chart.js 공통 설정 — 글자색·격자색을 CSS 변수에서 가져옴
function 기본옵션() {
  const dim = css('--dim'), line = css('--line');
  Chart.defaults.color = dim;
  Chart.defaults.borderColor = line;
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  Chart.defaults.font.size = 11;
}

// ── 그림 A. N-Day 리텐션 ─────────────────────────────────────────────
function 그림_nday(d) {
  const el = document.getElementById('chart-nday');
  if (!d || !el) return;
  document.getElementById('nday-users').textContent = d['유저수'].toLocaleString();
  new Chart(el, {
    type: 'line',
    data: {
      labels: d['점'].map(p => 'D' + p.day),
      datasets: [{
        data: d['점'].map(p => +(p['리텐션'] * 100).toFixed(2)),
        borderColor: css('--accent'),
        backgroundColor: css('--accent') + '22',
        borderWidth: 2, pointRadius: 2.5, pointHoverRadius: 5, fill: true, tension: .25
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => {
              const p = d['점'][c.dataIndex];
              return `${c.parsed.y}%  (분모 ${p['분모'].toLocaleString()}명)`;
            }
          }
        }
      },
      scales: {
        y: { min: 0, max: 100, ticks: { callback: v => v + '%' } },
        x: { grid: { display: false } }
      }
    }
  });
}

// ── 그림 B. 기준일별 D1 ──────────────────────────────────────────────
// 학습/평가 구간을 배경 띠로 칠하는 작은 플러그인
const 띠플러그인 = {
  id: '띠',
  beforeDatasetsDraw(chart, args, opts) {
    const { ctx, chartArea: a, scales: { x } } = chart;
    if (!opts || !opts.구간) return;
    ctx.save();
    const 칸 = x.width / Math.max(1, x.max - x.min);   // 한 칸의 픽셀 폭
    opts.구간.forEach(z => {
      const x1 = x.getPixelForValue(z.시작) - 칸 / 2;
      const x2 = x.getPixelForValue(z.끝) + 칸 / 2;
      ctx.fillStyle = z.색;
      ctx.fillRect(x1, a.top, x2 - x1, a.bottom - a.top);
      ctx.fillStyle = css('--dim');
      ctx.font = '600 10px ' + Chart.defaults.font.family;
      ctx.fillText(z.이름, x1 + 6, a.top + 13);
    });
    ctx.restore();
  }
};

function 그림_d1(d) {
  const el = document.getElementById('chart-d1');
  if (!d || !el) return;
  const 점 = d['점'];
  const 학습 = 점.filter(p => p['구간'] === '학습');
  const 평가 = 점.filter(p => p['구간'] === '평가');
  new Chart(el, {
    type: 'line',
    plugins: [띠플러그인],
    data: {
      labels: 점.map(p => p['날짜']),
      datasets: [{
        label: '실제 재방문율',
        data: 점.map(p => +(p['D1'] * 100).toFixed(2)),
        borderColor: css('--accent'),
        borderWidth: 2.2, pointRadius: 2, pointHoverRadius: 5, tension: .2,
        segment: {
          borderColor: (c) => 점[c.p1DataIndex]['구간'] === '제외'
            ? css('--faint') : css('--accent')
        }
      }, {
        // 기대 모델이 낸 확률. 두 선의 틈이 곧 '편차' 임
        label: '기대 모델 예측',
        data: 점.map(p => +(p['기대'] * 100).toFixed(2)),
        borderColor: css('--sky-2'),
        borderWidth: 1.8, borderDash: [5, 4],
        pointRadius: 0, pointHoverRadius: 4, tension: .2
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true, position: 'bottom',
          labels: { boxWidth: 22, boxHeight: 2, padding: 14, font: { size: 11 } }
        },
        띠: {
          // 카테고리 축이라 라벨이 아니라 '몇 번째 칸인지'로 넘김
          구간: [
            { 시작: 점.indexOf(학습[0]), 끝: 점.indexOf(학습[학습.length - 1]),
              색: css('--line') + '77', 이름: '학습(정상)' },
            { 시작: 점.indexOf(평가[0]), 끝: 점.indexOf(평가[평가.length - 1]),
              색: css('--warm') + '18', 이름: '평가' }
          ]
        },
        tooltip: {
          callbacks: {
            title: (cs) => {
              const p = 점[cs[0].dataIndex];
              return `${p['날짜']} (${p['요일']}) · ${p['구간']}`;
            },
            label: (c) => `${c.dataset.label} ${c.parsed.y}%`,
            footer: (cs) => {
              const p = 점[cs[0].dataIndex];
              const 편차 = (p['D1'] - p['기대']) * 100;
              return `편차 ${편차 >= 0 ? '+' : ''}${편차.toFixed(2)}%p · 분모 ${p['분모'].toLocaleString()}`;
            }
          }
        }
      },
      scales: {
        y: { min: 72, max: 82, ticks: { callback: v => v + '%' } },
        x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } }
      }
    }
  });
}

// ── δ 슬라이더 ───────────────────────────────────────────────────────
// 조건 1개 묶음과 조건 2개 묶음을 각각 그림. 둘은 슬라이더도 따로 씀.
const MAXδ = 20;

function 묶음그리기(상자, 목록) {
  상자.className = 'grow';
  상자.innerHTML = 목록.map((g, i) => {
    const 찾음 = g['찾음δ'], 보고 = g['보고δ'];
    const w = (v) => Math.max(0, Math.min(100, (v / MAXδ) * 100));
    const 세그 = [];
    if (찾음 != null) 세그.push(`<div class="seg-found" style="width:${w(보고 ?? MAXδ) - w(찾음)}%;margin-left:${w(찾음)}%"></div>`);
    if (보고 != null) 세그.push(`<div class="seg-report" style="width:${100 - w(보고)}%"></div>`);
    const 크기 = g['평가행'] ? `평가 ${g['평가행'].toLocaleString()}행` : '';
    const r = g['희석r'] != null ? ` · 희석 ${g['희석r']}` : '';
    const 계산 = g['종류'] === '조건 2개' ? '(계산)' : '';
    return `<div class="row" data-i="${i}">
      <div class="row-head">
        <span class="gname">${g['이름']}</span>
        <span class="gsize">${크기}${r}</span>
      </div>
      <div class="track">${세그.join('')}<div class="marker" style="left:0%"></div></div>
      <div class="row-head">
        <span class="status">—</span>
        <span class="gnums">찾음 ${찾음 != null ? 찾음 + '%p' : '끝까지 못 찾음'} · 보고 ${보고 != null ? 보고 + '%p' : '—'}${계산}</span>
      </div>
    </div>`;
  }).join('');
}

function 묶음갱신(상자, 목록, δ, 출력) {
  출력.textContent = δ.toFixed(1);
  상자.querySelectorAll('.row').forEach(row => {
    const g = 목록[+row.dataset.i];
    row.querySelector('.marker').style.left = Math.min(100, (δ / MAXδ) * 100) + '%';
    const s = row.querySelector('.status');
    let 글, 반;
    if (g['찾음δ'] == null || δ < g['찾음δ']) { 글 = '못 찾음'; 반 = 's-none'; }
    else if (g['보고δ'] == null || δ < g['보고δ']) { 글 = '찾았지만 보고 불가'; 반 = 's-found'; }
    else { 글 = '보고 가능'; 반 = 's-report'; }
    // 측정한 δ 위에 서 있으면 그 판의 실측값을 같이 보여줌
    const 측 = (g['측정'] || []).find(m => Math.abs(m['δ'] - δ) < 1e-9);
    if (측) 글 += `  ·  Hit@3 ${측['Hit3'].toFixed(2)} · 겹침 ${측['겹침'].toFixed(2)} · t ${측['정답t'].toFixed(2)}`;
    s.textContent = 글;
    s.className = 'status ' + 반;
  });
}

function 묶음붙이기(상자id, 슬라이더id, 출력id, 목록) {
  const 상자 = document.getElementById(상자id);
  const 슬 = document.getElementById(슬라이더id);
  const 출력 = document.getElementById(출력id);
  if (!상자 || !슬 || !목록.length) return;
  묶음그리기(상자, 목록);
  슬.addEventListener('input', () => 묶음갱신(상자, 목록, +슬.value, 출력));
  묶음갱신(상자, 목록, +슬.value, 출력);
}

// ── 하한 곡선 ────────────────────────────────────────────────────────
function 그림_curve(d) {
  if (!d) return;
  document.getElementById('curve-wrap').classList.remove('hidden');
  document.getElementById('curve-n').textContent = d['점'].length.toLocaleString();
  document.getElementById('curve-slope').textContent = d['적합']['기울기'].toFixed(3);

  const 표 = document.getElementById('band-table');
  // 구간은 '평가 행' 으로 나눔 (산점도의 가로축인 유효 인원과는 다른 값임)
  표.innerHTML = '<tr><th>평가 행</th><th>집단</th><th>하한 중앙</th><th>최소~최대</th></tr>' +
    d['띠'].map(b => `<tr><td>${b['구간']}</td><td>${b['개수']}</td>
      <td class="num">${b['중앙']}%p</td><td class="num">${b['최소']}~${b['최대']}</td></tr>`).join('');

  new Chart(document.getElementById('chart-curve'), {
    type: 'scatter',
    data: {
      datasets: [{
        data: d['점'].map(p => ({ x: p['유효인원'], y: p['보고하한'], 이름: p['이름'], 축: p['축'] })),
        pointRadius: 2.5, pointHoverRadius: 6,
        backgroundColor: css('--accent') + '99'
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => [c.raw['이름'],
              `유효 인원 ${Math.round(c.parsed.x).toLocaleString()}명`,
              `보고 하한 ${c.parsed.y}%p`]
          }
        }
      },
      scales: {
        x: { type: 'logarithmic', title: { display: true, text: '유효 인원 (명)' } },
        y: { type: 'logarithmic', title: { display: true, text: '보고 하한 (%p)' } }
      }
    }
  });
}

// ── 시작 ─────────────────────────────────────────────────────────────
(async function () {
  기본옵션();
  const [nd, d1, gr, cv, mt] = await Promise.all(
    ['nday.json', 'd1_daily.json', 'groups.json', 'curve.json', 'meta.json'].map(읽기));

  if (mt) {
    document.getElementById('meta-line').textContent =
      `학습 ${mt['학습기간']} · 평가 ${mt['평가기간']} · 분석 행 ${mt['분석행'].toLocaleString()}`;
    document.getElementById('meta-bar').textContent = mt['판정선'].toFixed(2);
    document.getElementById('built').textContent = `마지막 갱신 ${mt['만든날']}`;
  }
  그림_nday(nd);
  그림_d1(d1);
  if (gr && gr.length) {
    묶음붙이기('groups1', 'delta1', 'delta-out1', gr.filter(g => g['종류'] === '조건 1개'));
    묶음붙이기('groups2', 'delta2', 'delta-out2', gr.filter(g => g['종류'] === '조건 2개'));
  }
  그림_curve(cv);
})();

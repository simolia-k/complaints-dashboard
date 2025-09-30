/***** ───────── 설정 ───────── */
const CSV_PATH = './data/민원_preprocessed.csv'; // 파일명 바꾸셨다면 여기만 수정
/***** ─────────────────────── */

const $ = (sel) => document.querySelector(sel);
const els = {
  age: document.querySelector('#ageSelect, #age-filter'),
  gender: document.querySelector('#genderSelect, #gender-filter'),
  kpiTitle: $('#kpiTitle'),
  kpiValue: $('#kpiValue'),
  chart: $('#categoryChart')
};

function nf(n){ return (n||0).toLocaleString(); }
function norm(s){ return String(s||'').replace(/^\uFEFF/, '').trim().toLowerCase().replace(/\s+/g,''); }

function detectDelimiter(firstLine) {
  const candidates = [',',';','\t','|'];
  const counts = candidates.map(d => ({ d, c: (firstLine.match(new RegExp(`\\${d}`,'g'))||[]).length }));
  counts.sort((a,b)=>b.c-a.c);
  return counts[0].c ? counts[0].d : ','; // 기본 콤마
}

function splitCSVLine(line, delim) {
  // 따옴표 안의 구분자는 무시
  const re = new RegExp(`${delim}(?=(?:(?:[^"]*"){2})*[^"]*$)`);
  return line.split(re).map(s => s.replace(/^"|"$/g,'').trim());
}

function buildHeaderMap(headers){
  const alias = {
    age:    ['연령','연령대','나이','age'],
    gender: ['성별','gender','sex'],
    category:['분야','카테고리','유형','category','type'],
    count:  ['건수','수','빈도','건','count','cnt','frequency']
  };
  const map = {};
  headers.forEach(h=>{
    const n = norm(h);
    for (const key of Object.keys(alias)){
      if (!map[key] && alias[key].some(a=>norm(a)===n)) { map[key]=h; break; }
    }
  });
  return map;
}

async function loadCSV() {
  const res = await fetch(`${CSV_PATH}?t=${Date.now()}`); // 캐시 무력화
  if (!res.ok) throw new Error('CSV 로드 실패: ' + res.status);
  const text = (await res.text()).replace(/\r/g,'').trim();
  if (!text) throw new Error('빈 파일입니다.');

  const lines = text.split('\n').filter(Boolean);
  const delim = detectDelimiter(lines[0]);
  const rawHeaders = splitCSVLine(lines[0], delim).map(h => h.replace(/^\uFEFF/,'').trim());
  const H = buildHeaderMap(rawHeaders);

  // 필수 컬럼 확인(없어도 최대한 추론했지만, 최종 4개가 다 있어야 정상 집계)
  const need = ['age','gender','category','count'];
  const missing = need.filter(k => !H[k]);
  if (missing.length) {
    console.error('헤더 자동매핑 실패:', {rawHeaders, H, missing});
    throw new Error(`CSV 헤더를 확인하세요. 필요한 열: 연령/성별/분야/건수`);
  }

  const rows = lines.slice(1).map(line=>{
    const cells = splitCSVLine(line, delim);
    const obj = {};
    rawHeaders.forEach((h,i)=> obj[h] = cells[i] ?? '');
    return {
      age: obj[H.age],
      gender: obj[H.gender],
      category: obj[H.category],
      count: Number(String(obj[H.count]).replace(/[^0-9.-]/g,'')) || 0
    };
  });

  return rows;
}

let RAW = [];
let chart;

function getFiltered() {
  const ageSel = (els.age?.value || '전체').trim();
  const genderSel = (els.gender?.value || '전체').trim();
  return RAW.filter(r=>{
    const ageOk = ageSel === '전체' || norm(r.age).includes(norm(ageSel)); // '20' vs '20대'도 매칭
    const genderOk = genderSel === '전체' || norm(r.gender) === norm(genderSel);
    return ageOk && genderOk;
  });
}

function render() {
  const data = getFiltered();

  // KPI
  const total = data.reduce((s,d)=>s+d.count,0);
  if (els.kpiTitle) els.kpiTitle.textContent = '전체 민원';
  if (els.kpiValue) els.kpiValue.textContent = `${nf(total)} 건`;

  // 분야 합계
  const byCat = {};
  for (const d of data) {
    const key = d.category || '(미정의)';
    byCat[key] = (byCat[key]||0) + (d.count||0);
  }
  const labels = Object.keys(byCat).filter(k=>k && k!=='undefined');
  const values = labels.map(k=>byCat[k]);

  const ctx = els.chart?.getContext('2d');
  if (!ctx) return;

  if (!labels.length) {
    // 데이터 없음 시 차트 초기화 & 안내
    if (chart) { chart.destroy(); chart = null; }
    console.warn('표시할 데이터가 없습니다. 필터/헤더/값을 확인하세요.');
    return;
  }

  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = values;
    chart.update();
  } else {
    chart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: '분야별 민원 건수', data: values }] },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
        plugins: { legend: { display:false }, title:{ display:true, text:'분야별 민원 건수' } }
      }
    });
  }
}

async function init(){
  try {
    RAW = await loadCSV();
    render();
    els.age?.addEventListener('change', render);
    els.gender?.addEventListener('change', render);
  } catch (e) {
    console.error(e);
    if (els.kpiTitle) els.kpiTitle.textContent = '데이터 오류';
    if (els.kpiValue) els.kpiValue.textContent = '-';
  }
}

document.addEventListener('DOMContentLoaded', init);

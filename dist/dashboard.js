(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  // v2 intentionally starts clean: v1 was a browser-only prototype and may
  // contain records from an incompatible dashboard controller.
  const STORAGE_KEY = 'h-premium-portfolio-v2';
  const TASKS_KEY = 'h-premium-tasks-v2';
  const API_KEY = 'h-premium-api-base';
  const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value || 0);
  const escapeHtml = (value) => String(value || '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const number = (value) => Number(value) || 0;

  const seedProperties = [
    { name: 'Apartamento · Jardim Oceânico', place: 'Barra da Tijuca', details: '238 m² · 4 quartos · vista parcial', area: 238, asking: 5200000, market: 4960000, days: 12 },
    { name: 'Cobertura · Península', place: 'Barra da Tijuca', details: '180 m² · 3 suítes · andar alto', area: 180, asking: 4650000, market: 3900000, days: 83 },
    { name: 'Frontal mar · Lúcio Costa', place: 'Barra da Tijuca', details: '210 m² · 4 quartos · alto padrão', area: 210, asking: 7100000, market: 6900000, days: 29 },
    { name: 'Casa · Itanhangá', place: 'Itanhangá', details: '420 m² · 5 quartos · terreno amplo', area: 420, asking: 6300000, market: 5200000, days: 112 },
    { name: 'Apartamento · Reserva', place: 'Barra da Tijuca', details: '156 m² · 3 suítes · 2 vagas', area: 156, asking: 2750000, market: 2810000, days: 44 },
    { name: 'Apartamento · Barra', place: 'Barra da Tijuca', details: '102 m² · 3 quartos · reformado', area: 102, asking: 1650000, market: 1700000, days: 18 },
  ];
  const seedTasks = [
    { icon: '⚠', title: 'Reunião de preço · Cobertura Península', detail: 'Pedido acima da referência e 83 dias em carteira.' },
    { icon: '◎', title: 'Produzir vídeo · Frontal mar Lúcio Costa', detail: 'Vista e localização devem ativar demanda qualificada.' },
    { icon: '↗', title: 'Captação · Jardim Oceânico', detail: 'Boa aderência à carteira e faixa próxima do mercado.' },
    { icon: '◷', title: 'Revisar estratégia · Casa Itanhangá', detail: '112 dias de carteira e distância relevante da faixa.' },
  ];

  const read = (key, fallback) => {
    try { const parsed = JSON.parse(localStorage.getItem(key)); return Array.isArray(parsed) ? parsed : fallback; } catch { return fallback; }
  };
  let properties = read(STORAGE_KEY, seedProperties);
  let tasks = read(TASKS_KEY, seedTasks);
  const save = () => { localStorage.setItem(STORAGE_KEY, JSON.stringify(properties)); localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); };

  const params = new URLSearchParams(window.location.search);
  if (params.has('api')) localStorage.setItem(API_KEY, params.get('api').replace(/\/$/, ''));
  const configuredBase = document.body.dataset.apiBase || localStorage.getItem(API_KEY) || '';
  const apiUrl = (path) => `${configuredBase}${path}`;
  let apiAvailable = false;

  const signalFor = (property) => {
    if (!number(property.market)) return { label: 'Sem referência', className: 'amber', action: 'Gerar precificação' };
    const gap = property.asking / property.market - 1;
    if (gap > 0.12 || property.days > 75) return { label: 'Ação imediata', className: 'red', action: 'Revisar preço' };
    if (gap < -0.08) return { label: 'Oportunidade', className: 'green', action: 'Ativar demanda' };
    return { label: 'Acompanhar', className: 'amber', action: 'Acompanhar visitas' };
  };
  const showPage = (id) => { $$('.tab').forEach((tab) => tab.classList.toggle('on', tab.dataset.page === id)); $$('.page').forEach((page) => page.classList.toggle('on', page.id === id)); };
  const taskMarkup = (task, index, controls) => `<div class="task"><div class="ico">${task.icon}</div><div><b>${escapeHtml(task.title)}</b><small>${escapeHtml(task.detail)}</small></div>${controls ? `<button class="ghost" data-complete="${index}">Concluir</button>` : ''}</div>`;

  const fromApiProperty = (item) => ({ id: item.id, name: item.name, place: item.bairro, details: item.details, area: item.area_m2, asking: item.asking_brl, market: item.market_brl, days: item.days_on_market });
  const fromApiAction = (item) => ({ id: item.id, icon: '◷', title: item.title, detail: item.detail });

  function render() {
    const total = properties.reduce((sum, property) => sum + number(property.asking), 0);
    const review = properties.filter((property) => signalFor(property).label === 'Ação imediata');
    const priced = properties.filter((property) => number(property.market));
    const inRange = priced.filter((property) => Math.abs(property.asking / property.market - 1) <= 0.12);
    const fit = priced.length ? Math.round(inRange.length / priced.length * 100) : 0;
    const attention = properties.length ? Math.round(review.length / properties.length * 100) : 0;
    $('#portfolio-value').textContent = money(total);
    $('#portfolio-count').textContent = `${properties.length} imóveis cadastrados`;
    $('#review-count').textContent = `${review.length} ${review.length === 1 ? 'imóvel' : 'imóveis'}`;
    $('#review-value').textContent = review.length ? `${money(review.reduce((sum, property) => sum + number(property.asking), 0))} em exposição` : 'nenhuma revisão urgente';
    $('#market-fit').textContent = priced.length ? `${fit}%` : '—';
    $('#task-count').textContent = tasks.length;
    $('#count').textContent = tasks.length;
    $('#queue').textContent = `${tasks.length} ações pendentes`;
    $('#tasks').innerHTML = tasks.length ? tasks.map((task, index) => taskMarkup(task, index, true)).join('') : '<div class="task">Tudo concluído.</div>';
    $('#report').innerHTML = tasks.length ? tasks.map((task, index) => taskMarkup(task, index, false)).join('') : '<div class="task">Nenhuma pendência para os próximos 7 dias.</div>';
    $('#fit-label').textContent = priced.length ? `${fit}%` : 'sem referências';
    $('#fit-progress').style.width = `${fit}%`;
    $('#fit-progress').style.background = 'var(--good)';
    $('#attention-label').textContent = `${attention}%`;
    $('#attention-progress').style.width = `${attention}%`;
    $('#attention-progress').style.background = 'var(--danger)';
    $('#insight').innerHTML = review.length ? `<b>Leitura da semana:</b> ${review.length} imóvel(is) pedem revisão de estratégia antes de ampliar mídia.` : '<b>Leitura da semana:</b> não há imóveis acima da faixa de atenção definida.';
    $('#pnote').textContent = `${properties.length} imóveis na visão`;
    const query = ($('#search').value || '').trim().toLowerCase();
    const filter = $('#filter').value;
    const filtered = properties.filter((property) => {
      const signal = signalFor(property);
      return `${property.name} ${property.place}`.toLowerCase().includes(query) && (!filter || signal.label === filter);
    });
    $('#rows').innerHTML = filtered.map((property) => {
      const signal = signalFor(property); const index = properties.indexOf(property);
      const market = number(property.market) ? `${money(property.market)}<span class="sub">${Math.round((property.asking / property.market - 1) * 100)}% vs pedido</span>` : '<span class="sub">Aguardando API</span>';
      return `<tr><td class="name">${escapeHtml(property.name)}<span class="sub">${escapeHtml(property.place)} · ${escapeHtml(property.details)}</span></td><td>${money(property.asking)}</td><td>${market}</td><td>${property.days} dias</td><td><span class="tag ${signal.className}">${signal.label}</span></td><td><button class="link" data-property="${index}">${signal.action} →</button></td></tr>`;
    }).join('') || '<tr><td colspan="6">Nenhum imóvel encontrado.</td></tr>';
    $('#contentP').innerHTML = properties.map((property, index) => `<option value="${index}">${escapeHtml(property.name)}</option>`).join('');
  }

  async function requestValuation(input) {
    const response = await fetch(apiUrl('/v1/valuation'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    if (!response.ok) { const message = await response.text(); throw new Error(message || 'Não foi possível consultar a API.'); }
    return response.json();
  }
  async function checkApi() {
    const status = $('#api-status');
    try {
      const response = await fetch(apiUrl('/health'));
      const data = await response.json();
      if (!response.ok || !data.price_model_loaded) throw new Error('model unavailable');
      apiAvailable = true; status.classList.add('ok'); status.innerHTML = '<strong>● Modelo de mercado ativo</strong> · ITBI Rio';
      const [remoteProperties, remoteActions] = await Promise.all([fetch(apiUrl('/v1/properties')).then((r) => r.json()), fetch(apiUrl('/v1/actions')).then((r) => r.json())]);
      properties = remoteProperties.map(fromApiProperty); tasks = remoteActions.map(fromApiAction); render();
    } catch {
      apiAvailable = false; status.classList.remove('ok'); status.innerHTML = `<strong>● API indisponível</strong> · ${configuredBase ? 'verifique a conexão' : 'abra pelo servidor da API'}`;
    }
  }
  function valuationPayload(values) { return { bairro: values.bairro, area_m2: number(values.area), quartos: number(values.quartos), suites: number(values.suites), vagas: number(values.vagas), descricao: values.desc || 'Imóvel premium' }; }
  function renderValuation(data, values) {
    const market = number(data.estimated_total_brl); const gap = (number(values.asking) / market - 1) * 100; const review = gap > 12 || number(values.days) > 75;
    $('#result').innerHTML = `<div class="eyebrow">LEITURA DE PREÇO · ${escapeHtml(String(values.bairro).toUpperCase())}</div><div class="price">${money(market)}</div><small class="${data.confidence === 'alta' ? 'good' : 'warn'}">● confiança ${escapeHtml(data.confidence)}</small><div class="split"><div class="box"><small>VALOR PEDIDO</small><b>${money(number(values.asking))}</b></div><div class="box"><small>DIFERENÇA VS. MODELO</small><b class="${review ? 'bad' : 'good'}">${gap > 0 ? '+' : ''}${Math.round(gap)}%</b></div></div><div class="recommend"><b>Próxima conversa recomendada</b>${review ? 'O pedido pede revisão com comparáveis e atributos confirmados antes de ampliar a divulgação.' : 'O pedido está próximo da referência-modelo. Defenda os diferenciais e acompanhe a qualidade da demanda.'}</div><p class="sub" style="margin-top:18px">${escapeHtml(data.explanation)}</p>`;
  }
  async function renderComparables(property) {
    if (!apiAvailable || !property.id) return;
    try {
      const response = await fetch(apiUrl('/v1/comparables'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ property_id: property.id }) });
      if (!response.ok) return;
      const data = await response.json();
      const rows = data.comparables.map((item) => `<li>${escapeHtml(item.name)} · ${escapeHtml(item.bairro)} · ${money(item.asking_brl)} <span class="sub">aderência semântica ${Math.round(item.similarity * 100)}%</span></li>`).join('');
      $('#result').insertAdjacentHTML('beforeend', `<div class="recommend"><b>Comparáveis da carteira · Hugging Face</b><ul>${rows}</ul></div>`);
    } catch { /* Pricing remains available when semantic search is unavailable. */ }
  }
  async function renderTerritory(property) {
    if (!apiAvailable) return;
    try {
      const response = await fetch(apiUrl(`/v1/territory/context?bairro=${encodeURIComponent(property.place)}`));
      if (!response.ok) return;
      const data = await response.json();
      $('#result').insertAdjacentHTML('beforeend', `<div class="recommend"><b>Contexto territorial · dados públicos</b>${escapeHtml(data.bairro)}, ${escapeHtml(data.municipality)} · ${escapeHtml(data.state)}.<br><span class="sub">Fonte: ${escapeHtml(data.source)} · consulta atualizada nesta análise.</span></div>`);
    } catch { /* Territory data should not block the commercial workflow. */ }
  }

  $$('.tab').forEach((tab) => tab.addEventListener('click', () => showPage(tab.dataset.page)));
  $$('[data-open-modal]').forEach((button) => button.addEventListener('click', () => $('#modal').classList.add('open')));
  $('[data-close-modal]').addEventListener('click', () => $('#modal').classList.remove('open'));
  $('#search').addEventListener('input', render); $('#filter').addEventListener('change', render);
  $('#tasks').addEventListener('click', async (event) => { const button = event.target.closest('[data-complete]'); if (!button) return; const task = tasks[number(button.dataset.complete)]; if (task?.id && apiAvailable) await fetch(apiUrl(`/v1/actions/${task.id}/complete`), { method: 'POST' }); tasks.splice(number(button.dataset.complete), 1); save(); render(); });
  $('#rows').addEventListener('click', (event) => { const button = event.target.closest('[data-property]'); if (!button) return; const property = properties[number(button.dataset.property)]; if (!property) return; const form = $('#valuation-form'); form.elements.bairro.value = property.place; form.elements.area.value = property.area; form.elements.asking.value = property.asking; form.elements.days.value = property.days; form.elements.desc.value = `${property.name} · ${property.details}`; showPage('preco'); renderComparables(property); renderTerritory(property); });
  $('#valuation-form').addEventListener('submit', async (event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); $('#result').innerHTML = '<div class="empty"><div><b>Consultando modelo de mercado…</b>Calculando referência a partir da base oficial.</div></div>'; try { renderValuation(await requestValuation(valuationPayload(values)), values); } catch { $('#result').innerHTML = '<div class="empty"><div><b>Modelo indisponível.</b>Abra o painel pelo deploy Docker/Render ou configure a URL da API com <code>?api=https://sua-api</code>.</div></div>'; } });
  $('#add').addEventListener('submit', async (event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); const submit = event.currentTarget.querySelector('button[type="submit"]'); submit.disabled = true; submit.textContent = 'Consultando referência…'; let market = null; try { const data = await requestValuation({ bairro: values.place, area_m2: number(values.area), quartos: 0, suites: 0, vagas: 0, descricao: values.details || 'Imóvel premium' }); market = number(data.estimated_total_brl); } catch { /* Keep the record and label it clearly as awaiting a valuation. */ } finally { submit.disabled = false; submit.textContent = 'Adicionar à central'; }
    const property = { name: values.name, place: values.place, details: values.details || 'Atributos a completar', area: number(values.area), asking: number(values.price), market, days: number(values.days) }; if (apiAvailable) { const response = await fetch(apiUrl('/v1/properties'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: property.name, bairro: property.place, details: property.details, area_m2: property.area, asking_brl: property.asking, market_brl: property.market, days_on_market: property.days }) }); if (response.ok) property.id = (await response.json()).id; } properties.unshift(property); tasks.unshift({ icon: '◈', title: `Qualificar novo imóvel · ${values.name}`, detail: market ? 'Referência calculada. Valide os atributos e defina a próxima ação.' : 'Conecte a API para calcular a referência de mercado.' }); save(); event.currentTarget.reset(); $('#modal').classList.remove('open'); render(); showPage('central'); });
  $('#generate').addEventListener('click', () => { const property = properties[number($('#contentP').value)]; const goal = $('#goal').value; if (!property) return; $('#ctype').textContent = goal === 'reel' ? 'ROTEIRO · REEL' : goal === 'buyer' ? 'ABORDAGEM PARA COMPRADOR' : 'CONVERSA COM PROPRIETÁRIO'; $('#ctitle').textContent = goal === 'reel' ? `O que observar antes de escolher um imóvel em ${property.place}` : goal === 'buyer' ? `Um imóvel para quem valoriza ${property.place}` : 'Preço que protege valor também protege tempo'; $('#cbody').textContent = goal === 'owner' ? `“Nosso objetivo é posicionar ${property.name} numa faixa que convide a demanda certa. Hoje são ${property.days} dias de carteira. Vamos revisar comparáveis, diferenciais e retorno das visitas.”` : goal === 'buyer' ? `“Estou acompanhando ${property.name} em ${property.place}, com ${property.details}. Posso confirmar detalhes e agenda de visita?”` : `Gancho: “Nem todo imóvel premium entrega a mesma experiência.”\n\nContexto: ${property.name}, ${property.details}. Mostre apenas atributos confirmados em visita e convide para uma conversa privada.`; });
  $('#copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(`${$('#ctitle').textContent}\n\n${$('#cbody').textContent}`); } catch { /* Clipboard access is optional. */ } });
  $('#export').addEventListener('click', () => { const lines = tasks.map((task, index) => `${index + 1}. ${task.title} — ${task.detail}`).join('\n'); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([`VISTA AI — RESUMO EXECUTIVO\n\n${lines}`], { type: 'text/plain' })); link.download = 'resumo-vista-ai.txt'; link.click(); URL.revokeObjectURL(link.href); });

  render(); checkApi();
})();

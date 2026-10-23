(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const money = (value) => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
  }).format(value);
  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character]));

  const properties = [
    { name: 'Apartamento · Jardim Oceânico', place: 'Barra da Tijuca', details: '238 m² · 4 quartos · vista parcial', asking: 5200000, market: 4960000, days: 12, signal: 'Oportunidade', action: 'Ligar hoje' },
    { name: 'Cobertura · Península', place: 'Barra da Tijuca', details: '180 m² · 3 suítes · andar alto', asking: 4650000, market: 3900000, days: 83, signal: 'Ação imediata', action: 'Reunião de preço' },
    { name: 'Frontal mar · Lúcio Costa', place: 'Barra da Tijuca', details: '210 m² · 4 quartos · alto padrão', asking: 7100000, market: 6900000, days: 29, signal: 'Oportunidade', action: 'Produzir vídeo' },
    { name: 'Casa · Itanhangá', place: 'Itanhangá', details: '420 m² · 5 quartos · terreno amplo', asking: 6300000, market: 5200000, days: 112, signal: 'Ação imediata', action: 'Revisar estratégia' },
    { name: 'Apartamento · Reserva', place: 'Barra da Tijuca', details: '156 m² · 3 suítes · 2 vagas', asking: 2750000, market: 2810000, days: 44, signal: 'Acompanhar', action: 'Acompanhar visitas' },
    { name: 'Apartamento · Barra', place: 'Barra da Tijuca', details: '102 m² · 3 quartos · reformado', asking: 1650000, market: 1700000, days: 18, signal: 'Acompanhar', action: 'Qualificar leads' },
  ];
  let tasks = [
    { icon: '⚠', title: 'Reunião de preço · Cobertura Península', detail: 'Pedido 19% acima da referência e 83 dias em carteira.', property: 1 },
    { icon: '◎', title: 'Produzir vídeo · Frontal mar Lúcio Costa', detail: 'Vista e localização devem ativar demanda qualificada.', property: 2 },
    { icon: '↗', title: 'Captação · Jardim Oceânico', detail: 'Boa aderência à carteira e faixa próxima do mercado.', property: 0 },
    { icon: '◷', title: 'Revisar estratégia · Casa Itanhangá', detail: '112 dias de carteira e distância relevante da faixa.', property: 3 },
    { icon: '✦', title: 'Follow-up · Apartamento Reserva', detail: 'Imóvel em faixa; foco no retorno dos últimos contatos.', property: 4 },
  ];

  const taskMarkup = (task, index, controls) => `<div class="task"><div class="ico">${task.icon}</div><div><b>${escapeHtml(task.title)}</b><small>${escapeHtml(task.detail)}</small></div>${controls ? `<button class="ghost" data-complete="${index}">Concluir</button>` : ''}</div>`;
  const signalClass = (signal) => signal === 'Ação imediata' ? 'red' : signal === 'Oportunidade' ? 'green' : 'amber';

  function render() {
    const count = $('#count');
    const queue = $('#queue');
    const taskList = $('#tasks');
    const report = $('#report');
    const note = $('#pnote');
    const rows = $('#rows');
    const contentSelect = $('#contentP');
    if (!count || !queue || !taskList || !report || !note || !rows || !contentSelect) return;

    count.textContent = tasks.length;
    queue.textContent = `${tasks.length} ações pendentes`;
    taskList.innerHTML = tasks.length ? tasks.map((task, index) => taskMarkup(task, index, true)).join('') : '<div class="task">Tudo concluído.</div>';
    report.innerHTML = tasks.length ? tasks.map((task, index) => taskMarkup(task, index, false)).join('') : '<div class="task">Nenhuma pendência para os próximos 7 dias.</div>';
    note.textContent = `${properties.length} imóveis na visão`;

    const query = ($('#search')?.value || '').trim().toLowerCase();
    const filter = $('#filter')?.value || '';
    const filtered = properties.filter((property) => (
      `${property.name} ${property.place}`.toLowerCase().includes(query)
      && (!filter || property.signal === filter)
    ));
    rows.innerHTML = filtered.map((property, index) => `<tr><td class="name">${escapeHtml(property.name)}<span class="sub">${escapeHtml(property.place)} · ${escapeHtml(property.details)}</span></td><td>${money(property.asking)}</td><td>${money(property.market)}<span class="sub">${Math.round((property.asking / property.market - 1) * 100)}% vs pedido</span></td><td>${property.days} dias</td><td><span class="tag ${signalClass(property.signal)}">${property.signal}</span></td><td><button class="link" data-property="${properties.indexOf(property)}">${escapeHtml(property.action)} →</button></td></tr>`).join('') || '<tr><td colspan="6">Nenhum imóvel encontrado.</td></tr>';
    contentSelect.innerHTML = properties.map((property, index) => `<option value="${index}">${escapeHtml(property.name)}</option>`).join('');
  }

  function showPage(pageId) {
    $$('.tab').forEach((tab) => tab.classList.toggle('on', tab.dataset === pageId));
    $$('.page').forEach((page) => page.classList.toggle('on', page.id === pageId));
  }

  function openModal() { $('#modal')?.classList.add('open'); }
  function closeModal() { $('#modal')?.classList.remove('open'); }

  $$('.tab').forEach((tab) => tab.addEventListener('click', () => showPage(tab.dataset)));
  $$('.new').forEach((button) => button.addEventListener('click', (event) => { event.preventDefault(); openModal(); }));
  $('.close')?.addEventListener('click', closeModal);
  $('#search')?.addEventListener('input', render);
  $('#filter')?.addEventListener('change', render);

  $('#tasks')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-complete]');
    if (!button) return;
    tasks.splice(Number(button.dataset.complete), 1);
    render();
  });

  $('#rows')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-property]');
    if (!button) return;
    const property = properties[Number(button.dataset.property)];
    const form = $('#form');
    if (!property || !form) return;
    showPage('preco');
    form.elements.bairro.value = property.place;
    form.elements.area.value = Number.parseInt(property.details, 10) || '';
    form.elements.asking.value = property.asking;
    form.elements.days.value = property.days;
    form.elements.desc.value = `${property.name} · ${property.details}`;
  });

  $('#add')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const days = Number(data.days) || 0;
    properties.unshift({
      name: data.name, place: data.place, details: data.details || 'Atributos a completar',
      asking: Number(data.price), market: Number(data.price) * 0.94, days,
      signal: days > 75 ? 'Ação imediata' : 'Acompanhar',
      action: days > 75 ? 'Revisar preço' : 'Qualificar demanda',
    });
    tasks.unshift({ icon: '◈', title: `Qualificar novo imóvel · ${data.name}`, detail: 'Complete atributos e valide a faixa de preço.', property: 0 });
    event.currentTarget.reset();
    closeModal();
    render();
    showPage('central');
  });

  $('#form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const result = $('#result');
    const values = Object.fromEntries(new FormData(form));
    result.innerHTML = '<div class="empty"><div><b>Consultando modelo de mercado…</b>Calculando referência a partir da base oficial.</div></div>';
    try {
      const response = await fetch('/v1/valuation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bairro: values.bairro, area_m2: Number(values.area), quartos: Number(values.quartos), suites: Number(values.suites), vagas: Number(values.vagas), descricao: values.desc }) });
      if (!response.ok) throw new Error('valuation unavailable');
      const data = await response.json();
      const gap = (Number(values.asking) / data.estimated_total_brl - 1) * 100;
      const needsReview = gap > 12 || Number(values.days) > 75;
      result.innerHTML = `<div class="eyebrow">LEITURA DE PREÇO · ${escapeHtml(values.bairro.toUpperCase())}</div><div class="price">${money(data.estimated_total_brl)}</div><small class="good">● confiança ${escapeHtml(data.confidence)}</small><div class="split"><div class="box"><small>VALOR PEDIDO</small><b>${money(Number(values.asking))}</b></div><div class="box"><small>DIFERENÇA VS. MODELO</small><b class="${needsReview ? 'bad' : 'good'}">${gap > 0 ? '+' : ''}${Math.round(gap)}%</b></div></div><div class="recommend"><b>Próxima conversa recomendada</b>${needsReview ? 'O pedido está acima da referência-modelo. Leve comparáveis e valide os atributos que sustentam a faixa.' : 'O pedido está próximo da referência-modelo. Defenda os diferenciais do imóvel e acompanhe a qualidade da demanda.'}</div><p class="sub" style="margin-top:18px">${escapeHtml(data.explanation)} Estimativa indicativa, não é laudo.</p>`;
    } catch {
      result.innerHTML = '<div class="empty"><div><b>Modelo indisponível.</b>Não foi possível consultar a referência agora. Tente novamente em instantes.</div></div>';
    }
  });

  $('#generate')?.addEventListener('click', () => {
    const property = properties[Number($('#contentP').value)];
    const goal = $('#goal').value;
    if (!property) return;
    $('#ctype').textContent = goal === 'reel' ? 'ROTEIRO · REEL' : goal === 'buyer' ? 'ABORDAGEM PARA COMPRADOR' : 'CONVERSA COM PROPRIETÁRIO';
    $('#ctitle').textContent = goal === 'reel' ? `O que observar antes de escolher um imóvel em ${property.place}` : goal === 'buyer' ? `Um imóvel para quem valoriza ${property.place}` : 'Preço que protege valor também protege tempo';
    $('#cbody').textContent = goal === 'owner' ? `“Nosso objetivo não é apenas anunciar. É posicionar ${property.name} numa faixa que convide a demanda certa. Hoje são ${property.days} dias de carteira. Vamos revisar comparáveis, diferenciais e retorno das visitas antes do próximo movimento.”` : goal === 'buyer' ? `“Estou acompanhando ${property.name} em ${property.place} com ${property.details}. Pelo perfil que você descreveu, pode fazer sentido avaliar a planta e a localização. Posso confirmar detalhes e agenda de visita?”` : `Gancho: “Nem todo imóvel premium entrega a mesma experiência.”\n\nContexto: ${property.name}, ${property.details}. Mostre atributos confirmados em visita, para quem fazem sentido e convide para uma conversa privada.`;
  });

  $('#copy')?.addEventListener('click', async () => {
    const text = `${$('#ctitle').textContent}\n\n${$('#cbody').textContent}`;
    try { await navigator.clipboard.writeText(text); } catch { /* Clipboard access is optional. */ }
  });

  $('#export')?.addEventListener('click', () => {
    const text = `VISTA AI — RESUMO EXECUTIVO\n\n${tasks.map((task, index) => `${index + 1}. ${task.title} — ${task.detail}`).join('\n')}`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    link.download = 'resumo-vista-ai.txt';
    link.click();
    URL.revokeObjectURL(link.href);
  });

  render();
  showPage('central');
})();

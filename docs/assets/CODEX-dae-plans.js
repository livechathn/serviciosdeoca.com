/* Static pricing comparison. No API, credentials, storage, purchases or account creation. */
(() => {
  'use strict';
  document.querySelectorAll('[data-dae-pricing]').forEach(section => {
    const es = section.dataset.locale === 'es';
    const checkbox = section.querySelector('[data-byo]');
    const cards = Array.from(section.querySelectorAll('[data-tier]'));
    const status = section.querySelector('[data-price-status]');
    const note = section.querySelector('[data-byo-note]');
    const selection = section.querySelector('[data-selection]');
    const originalNote = note.textContent;
    const format = value => '$' + value.toLocaleString('en-US');
    let selected = null;

    function updateSelection() {
      if (!selected) return;
      const service = Number(selected.dataset.service);
      const total = service + (checkbox.checked ? 0 : Number(selected.dataset.ai));
      const mode = checkbox.checked
        ? (es ? 'servicio con BYO; IA pagada aparte' : 'service with BYO; AI paid separately')
        : (es ? 'total estimado, incluyendo presupuesto IA' : 'estimated total, including AI allowance');
      const text = `${selected.dataset.tier} · ${format(total)} USD / ${es ? 'mes' : 'month'} · ${mode}.`;
      selection.textContent = text;
    }

    function render() {
      const byo = checkbox.checked;
      cards.forEach(card => {
        const value = Number(card.dataset.service) + (byo ? 0 : Number(card.dataset.ai));
        card.querySelector('[data-price]').textContent = format(value);
        card.querySelector('[data-price-caption]').textContent = byo
          ? (es ? 'Solo servicio · USD' : 'Service only · USD')
          : (es ? 'Total estimado · USD' : 'Estimated total · USD');
        card.querySelector('[data-ai-row]').hidden = byo;
      });
      status.textContent = byo
        ? (es ? 'Mostrando solo nuestro servicio: $99 / $499 / $1,099 al mes. Sus accesos de IA se pagan aparte.' : 'Showing our service only: $99 / $499 / $1,099 per month. Your AI accesses are paid separately.')
        : (es ? 'Mostrando el total mensual estimado: $139 / $699 / $1,499. Nuestro servicio + sus suscripciones de IA.' : 'Showing estimated monthly total: $139 / $699 / $1,499. Our service + your AI subscriptions.');
      note.textContent = byo
        ? (es ? 'BYO no vuelve gratuitas sus suscripciones: usted conserva los cargos de sus proveedores. Se requieren dos accesos compatibles con capacidad suficiente para el nivel elegido.' : 'BYO does not make your subscriptions free: you keep paying your providers. Two compatible accesses with sufficient capacity for the selected tier are required.')
        : originalNote;
      updateSelection();
    }

    cards.forEach(card => card.querySelector('[data-select-plan]').addEventListener('click', () => {
      selected = card;
      updateSelection();
    }));
    checkbox.disabled = false;
    checkbox.addEventListener('change', render);
    window.addEventListener('pageshow', render);
    render();
  });
})();

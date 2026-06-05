(function () {
  var ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  function badgeLabel(index, useNumbers) {
    return useNumbers ? String(index + 1) : (ALPHA[index] || String(index + 1));
  }

  function closeAll(except) {
    document.querySelectorAll('.cs-wrap.cs-open').forEach(function (w) {
      if (w !== except) {
        w.classList.remove('cs-open');
        w.querySelector('.cs-trigger').setAttribute('aria-expanded', 'false');
      }
    });
  }

  function buildDropdown(select) {
    var options = Array.from(select.options).filter(function (o) { return o.value !== ''; });
    var useNumbers = options.length > 26;
    var placeholderText = select.options[0] ? select.options[0].text : 'Select...';

    select.style.display = 'none';

    var wrap = document.createElement('div');
    wrap.className = 'cs-wrap';

    // Trigger
    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'cs-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    var triggerText = document.createElement('span');
    triggerText.className = 'cs-trigger-text';
    triggerText.textContent = placeholderText;

    var chevronNS = 'http://www.w3.org/2000/svg';
    var chevron = document.createElementNS(chevronNS, 'svg');
    chevron.setAttribute('width', '12');
    chevron.setAttribute('height', '12');
    chevron.setAttribute('viewBox', '0 0 12 12');
    chevron.setAttribute('fill', 'none');
    chevron.setAttribute('stroke', 'currentColor');
    chevron.setAttribute('stroke-width', '2');
    chevron.setAttribute('class', 'cs-chevron');
    var poly = document.createElementNS(chevronNS, 'polyline');
    poly.setAttribute('points', '2 4 6 8 10 4');
    chevron.appendChild(poly);

    trigger.appendChild(triggerText);
    trigger.appendChild(chevron);

    // Panel
    var panel = document.createElement('div');
    panel.className = 'cs-panel';
    panel.setAttribute('role', 'listbox');

    options.forEach(function (opt, i) {
      var item = document.createElement('div');
      item.className = 'cs-option';
      item.setAttribute('role', 'option');
      item.setAttribute('data-value', opt.value);

      var bdg = document.createElement('span');
      bdg.className = 'cs-badge';
      bdg.textContent = badgeLabel(i, useNumbers);

      var textBlock = document.createElement('span');
      textBlock.className = 'cs-option-text';

      var lbl = document.createElement('span');
      lbl.className = 'cs-option-label';
      lbl.textContent = opt.text;
      textBlock.appendChild(lbl);

      var desc = opt.getAttribute('data-description');
      if (desc) {
        var descEl = document.createElement('span');
        descEl.className = 'cs-option-desc';
        descEl.textContent = desc;
        textBlock.appendChild(descEl);
      }

      item.appendChild(bdg);
      item.appendChild(textBlock);

      item.addEventListener('click', function () {
        select.value = opt.value;
        select.dispatchEvent(new Event('change'));
        triggerText.textContent = opt.text;
        triggerText.classList.add('cs-has-value');
        panel.querySelectorAll('.cs-option').forEach(function (o) { o.classList.remove('cs-selected'); });
        item.classList.add('cs-selected');
        wrap.classList.remove('cs-open');
        trigger.setAttribute('aria-expanded', 'false');
      });

      panel.appendChild(item);
    });

    // Sync display when native select is changed externally (e.g. reset)
    select.addEventListener('change', function () {
      if (!select.value) {
        triggerText.textContent = placeholderText;
        triggerText.classList.remove('cs-has-value');
        panel.querySelectorAll('.cs-option').forEach(function (o) { o.classList.remove('cs-selected'); });
      }
    });

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = wrap.classList.contains('cs-open');
      closeAll(wrap);
      if (!isOpen) {
        wrap.classList.add('cs-open');
        trigger.setAttribute('aria-expanded', 'true');
      } else {
        wrap.classList.remove('cs-open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });

    wrap.appendChild(trigger);
    wrap.appendChild(panel);
    select.parentNode.insertBefore(wrap, select.nextSibling);
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.attr-field select').forEach(buildDropdown);
    document.addEventListener('click', function () { closeAll(null); });
  });
})();

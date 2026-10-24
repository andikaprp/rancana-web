const rows = document.querySelector('#token-rows');
const search = document.querySelector('#token-search');
const count = document.querySelector('#token-count');
const status = document.querySelector('#interaction-status');
let actionCount = 0;
for (const button of document.querySelectorAll('.sample-action')) {
  button.addEventListener('click', () => {
    actionCount += 1;
    status.textContent = `Reference interaction ${actionCount}: “${button.textContent.trim()}”. Nothing is saved or sent.`;
  });
}

function valueCell(value) {
  const cell = document.createElement('td');
  if (/^#[0-9a-f]{6}$/i.test(value)) {
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.backgroundColor = value;
    swatch.setAttribute('aria-hidden', 'true');
    cell.append(swatch);
  }
  cell.append(document.createTextNode(value));
  return cell;
}

try {
  const response = await fetch('tokens.json');
  if (!response.ok) throw new Error(`Manifest request failed: ${response.status}`);
  const {tokens} = await response.json();
  function render() {
    const term = search.value.trim().toLowerCase();
    const visible = tokens.filter(token => `${token.name} ${token.light} ${token.literalStatus} ${token.source}`.toLowerCase().includes(term));
    rows.replaceChildren(...visible.map(token => {
      const row = document.createElement('tr');
      const name = document.createElement('th');
      name.scope = 'row';
      name.textContent = `--${token.name}`;
      const provenance = document.createElement('td');
      provenance.append(document.createTextNode(`${token.literalStatus.toUpperCase()} literal / proposed role`));
      const source = document.createElement('span');
      source.className = 'token-source';
      source.textContent = token.source;
      provenance.append(source);
      row.append(name, valueCell(token.light), provenance, valueCell(token.darkProposal));
      return row;
    }));
    count.textContent = `${visible.length} of ${tokens.length} proposed reference tokens`;
  }
  search.addEventListener('input', render);
  render();
} catch (error) {
  count.textContent = 'Token ledger unavailable. Read tokens.json or serve the catalog over localhost.';
  console.error(error);
}

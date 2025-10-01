let patients = JSON.parse(localStorage.getItem('suivi_ordonnances')) || [];

const form = document.getElementById('ordonnanceForm');
const tbody = document.querySelector('#ordonnancesTable tbody');
const saveBtn = document.getElementById('saveBtn');
const restoreBtn = document.getElementById('restoreBtn');
const restoreInput = document.getElementById('restoreInput');
const resetBtn = document.getElementById('resetBtn');

function computeExpiryDateFromDays(days) {
  const d = new Date();
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + Number(days));
  return d.toISOString();
}

function daysLeft(expiryIso) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const expiry = new Date(expiryIso);
  expiry.setHours(0,0,0,0);
  return Math.ceil((expiry - today)/(1000*60*60*24));
}

function saveToLocal() {
  localStorage.setItem('suivi_ordonnances', JSON.stringify(patients));
}

async function requestNotificationPermission() {
  if(!("Notification" in window)) return false;
  if(Notification.permission === "granted") return true;
  if(Notification.permission === "denied") return false;
  const perm = await Notification.requestPermission();
  return perm === "granted";
}

function showNotification(title, body) {
  if(Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

function checkNotifications() {
  patients.forEach(p => {
    const dl = daysLeft(p.expiry);
    if(dl <= 7 && dl >= 0 && !p.notified) {
      showNotification(
        `Ordonnance proche d’échéance: ${p.name}`,
        `L'ordonnance "${p.ordonnance}" expire dans ${dl} jour(s)`
      );
      p.notified = true; // ne pas notifier plusieurs fois
    }
  });
  saveToLocal();
}

function renderTable() {
  tbody.innerHTML = '';
  if(patients.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:10px;">Aucun enregistrement</td></tr>`;
    return;
  }
  patients.forEach(p => {
    const dl = daysLeft(p.expiry);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.ordonnance}</td>
      <td>${new Date(p.expiry).toLocaleDateString()}</td>
      <td style="color:${dl<=7 && dl>=0 ? 'red':'black'}">${dl}</td>
      <td><button class="delete-btn">Supprimer</button></td>
    `;
    tr.querySelector('.delete-btn').addEventListener('click', () => {
      patients = patients.filter(x => x.id !== p.id);
      saveToLocal();
      renderTable();
    });
    tbody.appendChild(tr);
  });
}

// Formulaire ajout
form.addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const ord = document.getElementById('ordonnance').value.trim();
  const days = Number(document.getElementById('days').value);
  if(!name || !ord || isNaN(days) || days<0) return;

  patients.unshift({ id: Date.now().toString(), name, ordonnance: ord, expiry: computeExpiryDateFromDays(days), notified:false });

  document.getElementById('name').value = '';
  document.getElementById('ordonnance').value = '';
  document.getElementById('days').value = '';

  saveToLocal();
  renderTable();
});

// Sauvegarde
saveBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(patients, null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ordonnances_backup.json';
  a.click();
  URL.revokeObjectURL(url);
});

// Restaurer
restoreBtn.addEventListener('click', () => restoreInput.click());
restoreInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      patients = JSON.parse(ev.target.result).map(p=>({...p, notified:false}));
      saveToLocal();
      renderTable();
    } catch {
      alert('Fichier invalide !');
    }
  };
  reader.readAsText(file);
});

// Réinitialiser
resetBtn.addEventListener('click', () => {
  if(confirm('Voulez-vous vraiment tout supprimer ?')) {
    patients = [];
    saveToLocal();
    renderTable();
  }
});

// Notifications bouton
document.getElementById('notifyBtn')?.addEventListener('click', async () => {
  const ok = await requestNotificationPermission();
  alert(ok ? "Notifications activées ✅" : "Notifications refusées ❌");
});

// Initial render
renderTable();

// Vérification automatique toutes les 10 minutes
setInterval(checkNotifications, 10*60*1000);

// Vérification immédiate au chargement
requestNotificationPermission().then(() => checkNotifications());

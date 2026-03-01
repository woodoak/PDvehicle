// =============================
// Supabase 設定
// =============================
const SUPABASE_URL = 'https://epdojmebklfrfnvycqcp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZG9qbWVia2xmcmZudnljcWNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyODM3MDUsImV4cCI6MjA4Nzg1OTcwNX0.IM6N3l2cJuCxOZdcEljaq9vhbCu_3lCgWR6LgHhYlCI';

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

// =============================
// 変数
// =============================
let vehicles = [];
let members = [];

const membersContainer = document.getElementById('members-container');
const addMemberBtn = document.getElementById('add-member');

// =============================
// 初期ロード
// =============================
window.addEventListener('load', async () => {
  await loadVehicles();
  await loadMembers();
});

// =============================
// Vehicles 取得
// =============================
async function loadVehicles() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/vehicles?select=*&order=name.asc`,
    { headers }
  );

  if (!res.ok) {
    console.error(await res.text());
    return;
  }

  vehicles = await res.json();
  renderVehiclesMaster();
}

// =============================
// Members 取得
// =============================
async function loadMembers() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/members?select=id,name`,
    { headers }
  );

  if (!res.ok) {
    console.error(await res.text());
    return;
  }

  members = await res.json();
  renderMembers();
}

// =============================
// 名簿表示
// =============================
async function renderMembers() {
  membersContainer.innerHTML = '';

  for (const member of members) {
    const wrapper = document.createElement('div');
    wrapper.className = 'member-row';

    // 名前編集
    const nameInput = document.createElement('input');
    nameInput.value = member.name || '';
    nameInput.addEventListener('change', () =>
      updateMemberName(member.id, nameInput.value)
    );
    wrapper.appendChild(nameInput);

    // 削除
    const delBtn = document.createElement('button');
    delBtn.textContent = '削除';
    delBtn.onclick = () => deleteMember(member.id);
    wrapper.appendChild(delBtn);

    // 所有数取得
    const countRes = await fetch(
      `${SUPABASE_URL}/rest/v1/member_vehicle_counts?select=vehicle_id,count&member_id=eq.${member.id}`,
      { headers }
    );

    const counts = await countRes.json();
    const countMap = {};
    (counts || []).forEach(c => {
      countMap[c.vehicle_id] = c.count;
    });

    const list = document.createElement('div');

    vehicles.forEach(vehicle => {
      const block = document.createElement('div');
      block.className = 'vehicle-block';

      // 車両名
      const vNameInput = document.createElement('input');
      vNameInput.value = vehicle.name;
      vNameInput.addEventListener('change', () =>
        updateVehicleName(vehicle.id, vNameInput.value)
      );
      block.appendChild(vNameInput);

      // − ボタン
      const minusBtn = document.createElement('button');
      minusBtn.textContent = '-';
      minusBtn.onclick = () =>
        changeCount(member.id, vehicle.id, -1);
      block.appendChild(minusBtn);

      // 数値
      const numInput = document.createElement('input');
      numInput.type = 'number';
      numInput.value = countMap[vehicle.id] || 0;
      numInput.addEventListener('change', () =>
        setCount(member.id, vehicle.id, parseInt(numInput.value || '0', 10))
      );
      block.appendChild(numInput);

      // ＋ ボタン
      const plusBtn = document.createElement('button');
      plusBtn.textContent = '+';
      plusBtn.onclick = () =>
        changeCount(member.id, vehicle.id, 1);
      block.appendChild(plusBtn);

      list.appendChild(block);
    });

    wrapper.appendChild(list);
    membersContainer.appendChild(wrapper);
  }
}

// =============================
// メンバー追加
// =============================
addMemberBtn.addEventListener('click', async () => {
  const name = prompt('名前を入力してください');
  if (!name) return;

  await fetch(`${SUPABASE_URL}/rest/v1/members`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name })
  });

  await loadMembers();
});

// =============================
// 名前変更
// =============================
async function updateMemberName(id, name) {
  await fetch(
    `${SUPABASE_URL}/rest/v1/members?id=eq.${id}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ name })
    }
  );
}

// =============================
// メンバー削除
// =============================
async function deleteMember(id) {
  await fetch(
    `${SUPABASE_URL}/rest/v1/member_vehicle_counts?member_id=eq.${id}`,
    { method: 'DELETE', headers }
  );

  await fetch(
    `${SUPABASE_URL}/rest/v1/members?id=eq.${id}`,
    { method: 'DELETE', headers }
  );

  await loadMembers();
}

// =============================
// 車両名変更
// =============================
async function updateVehicleName(id, name) {
  await fetch(
    `${SUPABASE_URL}/rest/v1/vehicles?id=eq.${id}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ name })
    }
  );

  await loadVehicles();
  await renderMembers();
}

// =============================
// 台数変更 ±1
// =============================
async function changeCount(memberId, vehicleId, diff) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/member_vehicle_counts?member_id=eq.${memberId}&vehicle_id=eq.${vehicleId}`,
    { headers }
  );

  const data = await res.json();
  let newCount = diff;

  if (data.length > 0) {
    newCount = (data[0].count || 0) + diff;
    if (newCount < 0) newCount = 0;

    await fetch(
      `${SUPABASE_URL}/rest/v1/member_vehicle_counts?id=eq.${data[0].id}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ count: newCount })
      }
    );
  } else {
    if (newCount < 0) newCount = 0;

    await fetch(`${SUPABASE_URL}/rest/v1/member_vehicle_counts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        member_id: memberId,
        vehicle_id: vehicleId,
        count: newCount
      })
    });
  }

  await renderMembers();
}

// =============================
// 台数直接セット
// =============================
async function setCount(memberId, vehicleId, value) {
  if (value < 0) value = 0;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/member_vehicle_counts?member_id=eq.${memberId}&vehicle_id=eq.${vehicleId}`,
    { headers }
  );

  const data = await res.json();

  if (data.length > 0) {
    await fetch(
      `${SUPABASE_URL}/rest/v1/member_vehicle_counts?id=eq.${data[0].id}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ count: value })
      }
    );
  } else {
    await fetch(`${SUPABASE_URL}/rest/v1/member_vehicle_counts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        member_id: memberId,
        vehicle_id: vehicleId,
        count: value
      })
    });
  }
}

// =============================
// 車両マスタ表示
// =============================
function renderVehiclesMaster() {
  const container = document.getElementById('vehicles-container');
  container.innerHTML = '';

  vehicles.forEach(v => {
    const row = document.createElement('div');

    const input = document.createElement('input');
    input.value = v.name;
    input.addEventListener('change', () =>
      updateVehicleName(v.id, input.value)
    );
    row.appendChild(input);

    const del = document.createElement('button');
    del.textContent = '削除';
    del.onclick = async () => {
      await fetch(
        `${SUPABASE_URL}/rest/v1/member_vehicle_counts?vehicle_id=eq.${v.id}`,
        { method: 'DELETE', headers }
      );

      await fetch(
        `${SUPABASE_URL}/rest/v1/vehicles?id=eq.${v.id}`,
        { method: 'DELETE', headers }
      );

      await loadVehicles();
      await renderMembers();
    };

    row.appendChild(del);
    container.appendChild(row);
  });

  const addBtn = document.getElementById('add-vehicle');
  addBtn.onclick = async () => {
    const name = prompt('車両名を入力してください');
    if (!name) return;

    await fetch(`${SUPABASE_URL}/rest/v1/vehicles`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name })
    });

    await loadVehicles();
    await renderMembers();
  };
}

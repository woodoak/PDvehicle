// Supabase の URL と anon key をここに
const SUPABASE_URL = 'https://epdojmebklfrfnvycqcp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Y7qM1t5qnp3a7bCGQpcgJA_drSUEAoV';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const membersContainer = document.getElementById('members-container');
const addMemberBtn = document.getElementById('add-member');

let vehicles = [];
let members = [];

// 初期ロード
window.addEventListener('load', async () => {
  await loadVehicles();
  await loadMembers();
});

// 車両一覧取得
async function loadVehicles() {
  const { data, error } = await supabaseClient
    .from('vehicles')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error(error);
    return;
  }
  vehicles = data;
  renderVehiclesMaster();
}

// 名簿一覧取得
async function loadMembers() {
  const { data, error } = await supabaseClient
    .from('members')
    .select('id, name');

  if (error) {
    console.error(error);
    return;
  }
  members = data;
  renderMembers();
}

// 名簿表示（1人ごとに車両リスト＋ボタン）
async function renderMembers() {
  membersContainer.innerHTML = '';

  for (const member of members) {
    const wrapper = document.createElement('div');
    wrapper.className = 'member-row';

    // 名前編集
    const nameInput = document.createElement('input');
    nameInput.value = member.name || '';
    nameInput.addEventListener('change', () => updateMemberName(member.id, nameInput.value));
    wrapper.appendChild(nameInput);

    // 削除ボタン
    const delBtn = document.createElement('button');
    delBtn.textContent = '削除';
    delBtn.onclick = () => deleteMember(member.id);
    wrapper.appendChild(delBtn);

    // 車両ごとの台数
    const list = document.createElement('div');

    // 所有数をまとめて取得
    const { data: counts } = await supabaseClient
      .from('member_vehicle_counts')
      .select('vehicle_id, count')
      .eq('member_id', member.id);

    const countMap = {};
    (counts || []).forEach(c => { countMap[c.vehicle_id] = c.count; });

    vehicles.forEach(vehicle => {
      const block = document.createElement('div');
      block.className = 'vehicle-block';

      // 車両名編集
      const vNameInput = document.createElement('input');
      vNameInput.value = vehicle.name;
      vNameInput.addEventListener('change', () => updateVehicleName(vehicle.id, vNameInput.value));
      block.appendChild(vNameInput);

      // マイナスボタン
      const minusBtn = document.createElement('button');
      minusBtn.textContent = '-';
      minusBtn.onclick = () => changeCount(member.id, vehicle.id, -1);
      block.appendChild(minusBtn);

      // 数値入力
      const numInput = document.createElement('input');
      numInput.type = 'number';
      numInput.value = countMap[vehicle.id] || 0;
      numInput.addEventListener('change', () =>
        setCount(member.id, vehicle.id, parseInt(numInput.value || '0', 10))
      );
      block.appendChild(numInput);

      // プラスボタン
      const plusBtn = document.createElement('button');
      plusBtn.textContent = '+';
      plusBtn.onclick = () => changeCount(member.id, vehicle.id, 1);
      block.appendChild(plusBtn);

      list.appendChild(block);
    });

    wrapper.appendChild(list);
    membersContainer.appendChild(wrapper);
  }
}

// 名簿追加
addMemberBtn.addEventListener('click', async () => {
  const name = prompt('名前を入力してください');
  if (!name) return;

  const { data, error } = await supabaseClient
    .from('members')
    .insert({ name })
    .select()
    .single();

  if (error) {
    console.error(error);
    return;
  }
  members.push(data);
  renderMembers();
});

// 名簿名変更
async function updateMemberName(id, name) {
  await supabaseClient.from('members').update({ name }).eq('id', id);
}

// 名簿削除
async function deleteMember(id) {
  await supabaseClient.from('member_vehicle_counts').delete().eq('member_id', id);
  await supabaseClient.from('members').delete().eq('id', id);
  members = members.filter(m => m.id !== id);
  renderMembers();
}

// 車両名変更
async function updateVehicleName(id, name) {
  await supabaseClient.from('vehicles').update({ name }).eq('id', id);
  await loadVehicles();
  await renderMembers();
}

// 台数を±1
async function changeCount(memberId, vehicleId, diff) {
  const { data } = await supabaseClient
    .from('member_vehicle_counts')
    .select('id, count')
    .eq('member_id', memberId)
    .eq('vehicle_id', vehicleId)
    .maybeSingle();

  let newCount = diff;
  if (data) newCount = (data.count || 0) + diff;
  if (newCount < 0) newCount = 0;

  if (!data) {
    await supabaseClient.from('member_vehicle_counts').insert({
      member_id: memberId,
      vehicle_id: vehicleId,
      count: newCount,
    });
  } else {
    await supabaseClient
      .from('member_vehicle_counts')
      .update({ count: newCount })
      .eq('id', data.id);
  }
  await renderMembers();
}

// 台数を直接セット
async function setCount(memberId, vehicleId, value) {
  if (value < 0) value = 0;

  const { data } = await supabaseClient
    .from('member_vehicle_counts')
    .select('id')
    .eq('member_id', memberId)
    .eq('vehicle_id', vehicleId)
    .maybeSingle();

  if (!data) {
    await supabaseClient.from('member_vehicle_counts').insert({
      member_id: memberId,
      vehicle_id: vehicleId,
      count: value,
    });
  } else {
    await supabaseClient
      .from('member_vehicle_counts')
      .update({ count: value })
      .eq('id', data.id);
  }
}

// 車両マスタ表示（追加・削除用の簡易UI）
function renderVehiclesMaster() {
  const container = document.getElementById('vehicles-container');
  container.innerHTML = '';

  vehicles.forEach(v => {
    const row = document.createElement('div');
    const input = document.createElement('input');
    input.value = v.name;
    input.addEventListener('change', () => updateVehicleName(v.id, input.value));
    row.appendChild(input);

    const del = document.createElement('button');
    del.textContent = '削除';
    del.onclick = async () => {
      await supabaseClient.from('member_vehicle_counts').delete().eq('vehicle_id', v.id);
      await supabaseClient.from('vehicles').delete().eq('id', v.id);
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
    await supabaseClient.from('vehicles').insert({ name });
    await loadVehicles();
    await renderMembers();
  };
}

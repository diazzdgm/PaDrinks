const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://moyvfmaftjyapbnozemp.supabase.co';
const key = process.argv[2];

if (!key) {
  console.error('Uso: node scripts/test-supabase.js <SERVICE_ROLE_KEY>');
  process.exit(1);
}

(async () => {
  const supabase = createClient(SUPABASE_URL, key, {
    auth: { persistSession: false },
  });

  console.log('');
  console.log('1) Acceso admin (auth.admin.listUsers)…');
  const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers();
  if (usersErr) {
    console.error('   ❌', usersErr.message);
    console.error('   => Esta llave NO es la service_role (secreta). Ese es el problema.');
  } else {
    console.log(`   ✅ OK — usuarios en auth: ${usersData.users.length}`);
  }

  const userId = usersData?.users?.[0]?.id;

  console.log('2) Escritura en subscriptions…');
  if (!userId) {
    console.log('   (no hay usuarios; inicia sesión al menos una vez primero)');
  } else {
    const { error: writeErr } = await supabase
      .from('subscriptions')
      .upsert(
        { user_id: userId, stripe_customer_id: 'diag_test', status: 'incomplete' },
        { onConflict: 'user_id' }
      );
    if (writeErr) {
      console.error('   ❌', writeErr.message, '|', writeErr.details || '', '|', writeErr.hint || '');
    } else {
      console.log('   ✅ Escritura OK (user_id ' + userId + ')');
    }
  }

  console.log('3) Lectura de subscriptions…');
  const { data: rows, error: readErr } = await supabase.from('subscriptions').select('*');
  if (readErr) console.error('   ❌', readErr.message);
  else console.log(`   ✅ Filas en la tabla: ${rows.length}`);
  console.log('');
})();

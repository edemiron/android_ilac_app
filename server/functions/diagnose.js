const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'ilacantiv1',
  });
}

async function checkRelationships() {
  const db = admin.firestore();
  console.log('--- USERS ---');
  const usersSnap = await db.collection('users').get();
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    console.log(`User ID: ${doc.id}`);
    console.log(`  Name: ${data.displayName || data.name || 'N/A'}`);
    console.log(`  Email: ${data.email || 'N/A'}`);
    console.log(`  PushToken: ${data.pushToken ? data.pushToken.slice(0, 20) + '...' : 'YOK'}`);
    console.log(`  CaregiverFcmToken: ${data.caregiverFcmToken ? data.caregiverFcmToken.slice(0, 20) + '...' : 'YOK'}`);
  }

  console.log('\n--- CAREGIVER RELATIONSHIPS ---');
  const relSnap = await db.collection('caregiverRelationships').get();
  console.log(`Total relationships: ${relSnap.size}`);
  for (const doc of relSnap.docs) {
    const data = doc.data();
    console.log(`Rel ID: ${doc.id}`);
    console.log(`  patientId: ${data.patientId}`);
    console.log(`  caregiverId: ${data.caregiverId}`);
    console.log(`  status: ${data.status}`);
    console.log(`  caregiverFcmToken: ${data.caregiverFcmToken ? data.caregiverFcmToken.slice(0, 20) + '...' : 'YOK'}`);
    console.log(`  canReceiveAlerts: ${data.canReceiveAlerts}`);
  }
}

checkRelationships().catch(console.error);

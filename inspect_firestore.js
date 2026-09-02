const { initializeApp } = require('./mobile/node_modules/firebase/app/dist/index.cjs.js');
const { getFirestore, collection, getDocs } = require('./mobile/node_modules/firebase/firestore/dist/index.cjs.js');

const firebaseConfig = {
  apiKey: "AIzaSyAsqXQZZiVM1EPF0k8MW_b2AsiUv4XSJhM",
  authDomain: "ilacantiv1.firebaseapp.com",
  projectId: "ilacantiv1",
  storageBucket: "ilacantiv1.firebasestorage.app",
  messagingSenderId: "708668760763",
  appId: "1:708668760763:android:2fb620035e210d5ca3ff9e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log('Fetching caregiverRelationships...');
  const relSnap = await getDocs(collection(db, 'caregiverRelationships'));
  console.log(`Found ${relSnap.size} relationships:`);
  relSnap.forEach(doc => {
    console.log(doc.id, JSON.stringify(doc.data(), null, 2));
  });

  console.log('\nFetching users...');
  const usersSnap = await getDocs(collection(db, 'users'));
  console.log(`Found ${usersSnap.size} users:`);
  for (const userDoc of usersSnap.docs) {
    console.log(`\nUser: ${userDoc.id} =>`, JSON.stringify(userDoc.data(), null, 2));
    
    // Check emergencyAlerts
    const emSnap = await getDocs(collection(db, 'users', userDoc.id, 'emergencyAlerts'));
    console.log(`  emergencyAlerts (${emSnap.size}):`);
    emSnap.forEach(d => console.log('   ', d.id, JSON.stringify(d.data())));

    // Check caregiverAlerts
    const cgSnap = await getDocs(collection(db, 'users', userDoc.id, 'caregiverAlerts'));
    console.log(`  caregiverAlerts (${cgSnap.size}):`);
    cgSnap.forEach(d => console.log('   ', d.id, JSON.stringify(d.data())));
  }
}

run().catch(console.error);

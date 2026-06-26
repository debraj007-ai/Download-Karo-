import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  updateDoc 
} from "firebase/firestore";

// Config from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyDQSewWfLyllssb0uNtZqBL4VpVS6kIFkc",
  authDomain: "gen-lang-client-0261664292.firebaseapp.com",
  projectId: "gen-lang-client-0261664292",
  storageBucket: "gen-lang-client-0261664292.firebasestorage.app",
  messagingSenderId: "919907426784",
  appId: "1:919907426784:web:135e0640599b1d47e1cb85"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
// Use custom firestoreDatabaseId if configured
export const db = getFirestore(app);

// Providersnp
const googleProvider = new GoogleAuthProvider();

/**
 * Signs in with Google Popup
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await syncUserProfile(result.user);
    return result.user;
  } catch (error: any) {
    console.error("Google sign in error:", error);
    throw error;
  }
}

/**
 * Sync user profile to Firestore
 */
export async function syncUserProfile(user: FirebaseUser, isPremium: boolean = false) {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // New user profile
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || "User",
      photoURL: user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.email}`,
      isPremium: isPremium, // Free by default, can purchase premium
      createdAt: new Date().toISOString()
    });
  } else {
    // Keep premium status but sync names
    const data = userSnap.data();
    await updateDoc(userRef, {
      displayName: user.displayName || data.displayName || "User",
      photoURL: user.photoURL || data.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.email}`
    });
  }
}

/**
 * Fetch detailed user data from firestore
 */
export async function getUserProfile(uid: string) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return userSnap.data();
  }
  return null;
}

/**
 * Toggle premium status in Firestore for mock upgrade
 */
export async function upgradeToPremium(uid: string) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    isPremium: true
  });
}

/**
 * Add a record to user's download history
 */
export async function saveDownloadRecord(
  userId: string, 
  url: string, 
  downloadUrl: string, 
  title: string, 
  platform: string, 
  quality: string
) {
  try {
    const downloadsRef = collection(db, "users", userId, "downloads");
    await addDoc(downloadsRef, {
      url,
      downloadUrl,
      title,
      platform,
      quality,
      downloadedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to save download history:", error);
  }
}

/**
 * Fetch download history logs for a user
 */
export async function getDownloadHistory(userId: string) {
  try {
    const downloadsRef = collection(db, "users", userId, "downloads");
    const q = query(downloadsRef, orderBy("downloadedAt", "desc"), limit(15));
    const querySnapshot = await getDocs(q);
    const downloads: any[] = [];
    querySnapshot.forEach((doc) => {
      downloads.push({ id: doc.id, ...doc.data() });
    });
    return downloads;
  } catch (error) {
    console.error("Failed to fetch download history:", error);
    return [];
  }
}

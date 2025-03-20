import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
  UserCredential,
  sendEmailVerification,
  fetchSignInMethodsForEmail,
  setPersistence,
  browserSessionPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";

// Global variable to ensure admin setup runs only once per app lifecycle
let adminSetupComplete = false;

// Default session timeout in minutes
const DEFAULT_SESSION_TIMEOUT = 30;
const SESSION_TIMEOUT_KEY = "session_timeout_minutes";
const LAST_ACTIVITY_KEY = "last_activity_timestamp";

interface AuthContextProps {
  currentUser: User | null;
  userData: any;
  signup: (
    email: string,
    password: string,
    name: string,
    role: string
  ) => Promise<UserCredential>;
  adminCreateUser: (
    email: string,
    password: string,
    name: string,
    role: string
  ) => Promise<{ success: boolean; error?: string; uid?: string }>;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  loading: boolean;
  sendVerificationEmail: (user: User) => Promise<void>;
  setSessionTimeout: (minutes: number) => Promise<void>;
  getSessionTimeout: () => Promise<number>;
  updateSecuritySettings: (
    enableTwoFactor: boolean,
    enforceStrongPassword: boolean,
    sessionTimeoutMinutes: number
  ) => Promise<void>;
  updateUserProfile: (
    name: string,
    phone: string,
    faculty: string,
    department: string,
    address: string,
    age: string
  ) => Promise<void>;
  isStrongPasswordRequired: () => Promise<boolean>;
  validatePasswordStrength: (password: string) => { isValid: boolean; message: string };
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(
    null
  );

  // Function to send verification email
  async function sendVerificationEmail(user: User) {
    return sendEmailVerification(user);
  }

  // Function to set the session timeout in minutes
  async function setSessionTimeout(minutes: number) {
    try {
      if (!minutes || minutes < 1) {
        minutes = DEFAULT_SESSION_TIMEOUT;
      }
      localStorage.setItem(SESSION_TIMEOUT_KEY, minutes.toString());

      // If the user is an admin, store this setting in Firestore as well
      if (currentUser && userData?.role === "admin") {
        const securitySettingsRef = doc(db, "settings", "security");
        await setDoc(
          securitySettingsRef,
          { sessionTimeoutMinutes: minutes },
          { merge: true }
        );
      }

      // Reset the inactivity timer with the new timeout
      resetInactivityTimer();
    } catch (error) {
      console.error("Error setting session timeout:", error);
    }
  }

  // Function to get the current session timeout setting
  async function getSessionTimeout() {
    try {
      // Try to get from Firestore first
      const securitySettingsRef = doc(db, "settings", "security");
      const securitySettings = await getDoc(securitySettingsRef);

      if (
        securitySettings.exists() &&
        securitySettings.data().sessionTimeoutMinutes
      ) {
        return securitySettings.data().sessionTimeoutMinutes;
      }

      // Fall back to localStorage
      const timeout = localStorage.getItem(SESSION_TIMEOUT_KEY);
      return timeout ? parseInt(timeout) : DEFAULT_SESSION_TIMEOUT;
    } catch (error) {
      console.error("Error getting session timeout:", error);
      return DEFAULT_SESSION_TIMEOUT;
    }
  }

  // Function to update all security settings at once
  async function updateSecuritySettings(
    enableTwoFactor: boolean,
    enforceStrongPassword: boolean,
    sessionTimeoutMinutes: number
  ) {
    try {
      const securitySettingsRef = doc(db, "settings", "security");
      await setDoc(
        securitySettingsRef,
        {
          enableTwoFactor,
          enforceStrongPassword,
          sessionTimeoutMinutes,
          updatedAt: serverTimestamp(),
          updatedBy: currentUser?.uid || "system",
        },
        { merge: true }
      );

      // Update the session timeout in localStorage
      await setSessionTimeout(sessionTimeoutMinutes);

      // Update last activity timestamp to reset the timer
      updateLastActivity();

      // Force check to apply the new timeout immediately
      setTimeout(() => {
        checkInactivity();
      }, 1000);
    } catch (error) {
      console.error("Error updating security settings:", error);
      throw error;
    }
  }

  // Update last activity timestamp
  function updateLastActivity() {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  }

  // Check for inactivity and log out if necessary
  function checkInactivity() {
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!lastActivity) {
      updateLastActivity();
      return;
    }

    getSessionTimeout().then((timeoutMinutes) => {
      const lastActivityTime = parseInt(lastActivity);
      const currentTime = Date.now();
      const inactiveTime = currentTime - lastActivityTime;
      const timeoutMilliseconds = timeoutMinutes * 60 * 1000;

      if (inactiveTime > timeoutMilliseconds) {
        // User has been inactive for too long, log them out
        console.log(
          `Logging out due to inactivity (${timeoutMinutes} min timeout)`
        );
        logout();
      }
    });
  }

  // Reset the inactivity timer
  function resetInactivityTimer() {
    // Clear any existing timer
    if (inactivityTimer) {
      clearInterval(inactivityTimer);
    }

    // Set up a new timer to check inactivity more frequently (every 10 seconds instead of every minute)
    const timer = setInterval(checkInactivity, 10 * 1000);
    setInactivityTimer(timer);
  }

  // Setup activity tracking
  useEffect(() => {
    if (currentUser) {
      // Set up activity listeners for more events to ensure better tracking
      const activityEvents = [
        "mousedown",
        "keydown",
        "touchstart",
        "scroll",
        "mousemove",
        "click",
        "focus",
        "blur",
      ];

      const handleActivity = () => {
        updateLastActivity();
      };

      // Add event listeners
      activityEvents.forEach((event) => {
        window.addEventListener(event, handleActivity);
      });

      // Initialize the inactivity timer
      resetInactivityTimer();

      // Initial activity update
      updateLastActivity();

      // Set session persistence based on role
      getSessionTimeout().then((timeout) => {
        if (userData?.role === "admin") {
          // For admins, use the configured session timeout
          setPersistence(auth, browserSessionPersistence).catch((error) =>
            console.error("Error setting persistence:", error)
          );
        }
      });

      // Check inactivity immediately
      checkInactivity();

      // Cleanup function
      return () => {
        // Remove event listeners
        activityEvents.forEach((event) => {
          window.removeEventListener(event, handleActivity);
        });

        // Clear the inactivity timer
        if (inactivityTimer) {
          clearInterval(inactivityTimer);
        }
      };
    }
  }, [currentUser, userData]);

  async function signup(
    email: string,
    password: string,
    name: string,
    role: string
  ) {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Update profile with name
    if (userCredential.user) {
      await updateProfile(userCredential.user, {
        displayName: name,
      });

      // Send verification email
      await sendEmailVerification(userCredential.user);

      // Store additional user data in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name,
        email,
        role,
        emailVerified: false,
        createdAt: serverTimestamp(),
      });
    }

    return userCredential;
  }

  // Function for admins to create users without affecting their current session
  async function adminCreateUser(
    email: string,
    password: string,
    name: string,
    role: string
  ) {
    try {
      // Create the user in Firebase Auth using a separate connection
      const response = await fetch(
        "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyABNDrseHZo8Lgt-uwAfzMRZNwQefCHQwY",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
            returnSecureToken: true,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to create user");
      }

      const uid = data.localId;

      // Now create user document in Firestore
      await setDoc(doc(db, "users", uid), {
        name,
        email,
        role,
        emailVerified: false,
        createdAt: serverTimestamp(),
        createdBy: currentUser?.uid || "system",
      });

      return { success: true, uid };
    } catch (error: any) {
      console.error("Error creating user:", error);
      return {
        success: false,
        error: error.message || "Failed to create user",
      };
    }
  }

  function login(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  // Function to check if the admin exists in authentication (by checking sign-in methods)
  async function adminExistsInAuth(email: string) {
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      return methods.length > 0;
    } catch (error) {
      console.error("Error checking if admin exists in auth:", error);
      return false;
    }
  }

  // Function to check if any admin accounts exist in Firestore
  async function adminExistsInFirestore() {
    try {
      const q = query(collection(db, "users"), where("role", "==", "admin"));
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error("Error checking for admin in Firestore:", error);
      return false;
    }
  }

  // Create admin account function that runs only once
  async function setupAdminAccount() {
    // Use module-level variable to ensure this runs only once across
    // component re-renders and even hot reloads
    if (adminSetupComplete) {
      return;
    }

    adminSetupComplete = true;

    const adminEmail = "vertexcampusmain@gmail.com";
    const adminPassword = "Vertex@#22";

    try {
      // First check if admin exists in Firestore
      const firestoreHasAdmin = await adminExistsInFirestore();

      if (firestoreHasAdmin) {
        console.log(
          "Admin account exists in Firestore. No need to create one."
        );
        return;
      }

      // Then check if admin exists in Authentication
      const authHasAdmin = await adminExistsInAuth(adminEmail);

      if (authHasAdmin) {
        // Admin exists in Auth but not in Firestore, try to sign in and create Firestore doc
        try {
          const userCredential = await signInWithEmailAndPassword(
            auth,
            adminEmail,
            adminPassword
          );

          console.log(
            "Found existing admin in auth, creating Firestore document..."
          );

          await setDoc(doc(db, "users", userCredential.user.uid), {
            name: "System Administrator",
            email: adminEmail,
            role: "admin",
            emailVerified: true,
            createdAt: serverTimestamp(),
          });

          console.log(
            "Admin Firestore document created for existing auth account"
          );
          await signOut(auth);
        } catch (signInError) {
          console.error(
            "Could not sign in with existing admin account:",
            signInError
          );
        }
      } else {
        // Admin doesn't exist in either place, create a new account
        try {
          console.log("Creating new admin account...");

          const userCredential = await createUserWithEmailAndPassword(
            auth,
            adminEmail,
            adminPassword
          );

          await updateProfile(userCredential.user, {
            displayName: "System Administrator",
          });

          await setDoc(doc(db, "users", userCredential.user.uid), {
            name: "System Administrator",
            email: adminEmail,
            role: "admin",
            emailVerified: true,
            createdAt: serverTimestamp(),
          });

          console.log("Admin account created successfully");
          await signOut(auth);
        } catch (createError) {
          console.error("Failed to create admin account:", createError);
        }
      }
    } catch (error) {
      console.error("Admin setup failed:", error);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        setUserData(null);
        setLoading(false);
      }
    });

    // Separate function call instead of directly in useEffect
    // This helps with better control flow
    setupAdminAccount().catch((err) => {
      console.error("Error in admin account setup:", err);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const userDocRef = doc(db, "users", currentUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        // Update the emailVerified field in Firestore if the user's email has been verified
        const userData = doc.data();
        if (currentUser.emailVerified && !userData.emailVerified) {
          // User has verified their email but Firestore hasn't been updated
          setDoc(userDocRef, { emailVerified: true }, { merge: true });
        }

        setUserData(doc.data());
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUser]);

  // Function to update user profile
  async function updateUserProfile(
    name: string,
    phone: string,
    faculty: string,
    department: string,
    address: string,
    age: string
  ) {
    if (!currentUser) {
      throw new Error("User must be logged in to update profile");
    }

    try {
      const userDocRef = doc(db, "users", currentUser.uid);

      // Update display name in Firebase Auth
      await updateProfile(currentUser, {
        displayName: name,
      });

      // Update user data in Firestore
      await updateDoc(userDocRef, {
        name,
        phone,
        faculty,
        department,
        address,
        age,
        updatedAt: serverTimestamp(),
      });

      // Update local state
      if (userData) {
        setUserData({
          ...userData,
          name,
          phone,
          faculty,
          department,
          address,
          age,
        });
      }
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }
  }

  // Function to check if strong password is required based on admin settings
  async function isStrongPasswordRequired() {
    try {
      const securitySettingsRef = doc(db, "settings", "security");
      const securitySettings = await getDoc(securitySettingsRef);
      
      if (securitySettings.exists()) {
        return securitySettings.data().enforceStrongPassword !== false;
      }
      
      // Default to true if setting doesn't exist
      return true;
    } catch (error) {
      console.error("Error checking password policy:", error);
      // Default to true on error for security
      return true;
    }
  }
  
  // Function to validate password strength
  function validatePasswordStrength(password: string) {
    // Basic length check
    if (password.length < 8) {
      return { 
        isValid: false, 
        message: "Password must be at least 8 characters long" 
      };
    }
    
    // Check for uppercase letters
    if (!/[A-Z]/.test(password)) {
      return { 
        isValid: false, 
        message: "Password must contain at least one uppercase letter" 
      };
    }
    
    // Check for lowercase letters
    if (!/[a-z]/.test(password)) {
      return { 
        isValid: false, 
        message: "Password must contain at least one lowercase letter" 
      };
    }
    
    // Check for numbers
    if (!/[0-9]/.test(password)) {
      return { 
        isValid: false, 
        message: "Password must contain at least one number" 
      };
    }
    
    // Check for special characters
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return { 
        isValid: false, 
        message: "Password must contain at least one special character" 
      };
    }
    
    return { isValid: true, message: "" };
  }

  const value = {
    currentUser,
    userData,
    signup,
    adminCreateUser,
    login,
    logout,
    loading,
    sendVerificationEmail,
    setSessionTimeout,
    getSessionTimeout,
    updateSecuritySettings,
    updateUserProfile,
    isStrongPasswordRequired,
    validatePasswordStrength,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

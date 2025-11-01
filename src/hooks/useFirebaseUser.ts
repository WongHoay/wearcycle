import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";

// Custom hook to get the current Firebase user and loading state - even after a refresh

export function useFirebaseUser() {
    const [user, setUser] = useState<User | null>(null);
    const [loadingUser, setLoadingUser] = useState(true);

    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setLoadingUser(false);
        });
        return () => unsubscribe();
    }, []);

    return { user, loadingUser };
}
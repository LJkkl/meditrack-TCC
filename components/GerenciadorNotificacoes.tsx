import { useEffect } from "react";
import { auth } from "../firebase";
import { syncDoseNotificationsForUser, syncLinkedDoseNotificationsForUser } from "../utils/notificacoes";

export default function GerenciadorNotificacoes() {
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        return;
      }

      try {
        await syncDoseNotificationsForUser(user.uid);
        await syncLinkedDoseNotificationsForUser(user.uid);
      } catch (error) {
        console.log(error);
      }
    });

    return () => unsubscribe();
  }, []);

  return null;
}

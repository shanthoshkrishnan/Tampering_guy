import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "/src/firebase/config";

const functions = getFunctions(app);

export async function sendVerificationEmailFrontend(email, name, token) {
  const fn = httpsCallable(functions, "sendVerificationEmail");
  const res = await fn({ email, name, token });
  return res.data;
}

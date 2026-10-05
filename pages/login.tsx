// pages/login.tsx
import { useState } from "react";
import { useRouter } from "next/router";
import { auth } from "../firebaseClient";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="w-80 rounded bg-white p-6 shadow-md"
      >
        <h2 className="mb-4 text-center text-2xl font-semibold">
          {isLogin ? "Login" : "Sign Up"}
        </h2>
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mb-2 w-full rounded border p-2"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mb-4 w-full rounded border p-2"
        />
        <button
          type="submit"
          className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700"
        >
          {isLogin ? "Sign in" : "Create account"}
        </button>
        <p className="mt-4 text-center text-sm">
          {isLogin ? "Don’t have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="font-medium text-blue-600 hover:underline"
          >
            {isLogin ? "Sign up" : "Login"}
          </button>
        </p>
      </form>
    </div>
  );
}

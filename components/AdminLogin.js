import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { supabase } from "../services/supabase";

export default function AdminLogin({ onBack, onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin() {
    if (!email.trim() || !password) {
      setErrorMessage("Email dan password wajib diisi.");
      return;
    }

    try {
      setLoadingLogin(true);
      setErrorMessage("");

      // Login melalui Supabase Authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      // Pastikan akun yang login terdaftar sebagai administrator
      const { data: isAdmin, error: adminError } =
        await supabase.rpc("is_admin");

      if (adminError) {
        await supabase.auth.signOut();
        throw adminError;
      }

      if (!isAdmin) {
        await supabase.auth.signOut();
        setErrorMessage("Akun ini tidak memiliki hak administrator.");
        return;
      }

      onLoginSuccess(data.user);
    } catch (error) {
      console.error("Login admin gagal:", error);
      setErrorMessage(
        error.message || "Login gagal. Silakan periksa email dan password."
      );
    } finally {
      setLoadingLogin(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={loginStyles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={loginStyles.card}>
        <Text style={loginStyles.logo}>
          Bundaku<Text style={loginStyles.logoAccent}>Klik.</Text>
        </Text>

        <View style={loginStyles.iconContainer}>
          <Text style={loginStyles.icon}>🔐</Text>
        </View>

        <Text style={loginStyles.title}>Admin Login</Text>
        <Text style={loginStyles.subtitle}>
          Silakan masuk untuk mengelola produk Bundaku Klik.
        </Text>

        <Text style={loginStyles.label}>Email Administrator</Text>
        <TextInput
          style={loginStyles.input}
          placeholder="Masukkan email"
          placeholderTextColor="#999999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
        />

        <Text style={loginStyles.label}>Password</Text>
        <TextInput
          style={loginStyles.input}
          placeholder="Masukkan password"
          placeholderTextColor="#999999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          onSubmitEditing={handleLogin}
        />

        {errorMessage ? (
          <View style={loginStyles.errorBox}>
            <Text style={loginStyles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Pressable
          style={[
            loginStyles.loginButton,
            loadingLogin && loginStyles.disabledButton,
          ]}
          onPress={handleLogin}
          disabled={loadingLogin}
        >
          {loadingLogin ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={loginStyles.loginButtonText}>MASUK ADMIN</Text>
          )}
        </Pressable>

        <Pressable
          style={loginStyles.backButton}
          onPress={onBack}
          disabled={loadingLogin}
        >
          <Text style={loginStyles.backText}>← Kembali ke Beranda</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const loginStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F3",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 430,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 30,
    elevation: 3,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  logo: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#263B2F",
    textAlign: "center",
  },
  logoAccent: {
    color: "#D58B45",
  },
  iconContainer: {
    alignSelf: "center",
    marginTop: 28,
    backgroundColor: "#EAF0E9",
    borderRadius: 50,
    width: 75,
    height: 75,
    justifyContent: "center",
    alignItems: "center",
  },
  icon: {
    fontSize: 34,
  },
  title: {
    fontSize: 23,
    fontWeight: "bold",
    color: "#263B2F",
    textAlign: "center",
    marginTop: 18,
  },
  subtitle: {
    fontSize: 13,
    color: "#888888",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 28,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#444444",
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 9,
    padding: 13,
    fontSize: 14,
    color: "#333333",
    backgroundColor: "#FFFFFF",
  },
  errorBox: {
    backgroundColor: "#FDECEC",
    borderRadius: 8,
    padding: 12,
    marginTop: 18,
  },
  errorText: {
    color: "#C0392B",
    fontSize: 12,
  },
  loginButton: {
    backgroundColor: "#263B2F",
    borderRadius: 9,
    padding: 15,
    marginTop: 25,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 13,
  },
  backButton: {
    marginTop: 22,
    alignItems: "center",
  },
  backText: {
    color: "#63806A",
    fontSize: 13,
    fontWeight: "600",
  },
});


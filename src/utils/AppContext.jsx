import React, { createContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode"; // Correct import without curly braces
import axios from "axios";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // Start with `undefined` for loading state
  const [apiKey, setApiKey] = useState(null);
  const [balance, setBalance] = useState(null);
  const [maintainance, setMaintainance] = useState(null);
  const [serviceData, setServiceData] = useState([]); // Add serviceData state
  const [loadingServiceData, setLoadingServiceData] = useState(true); // Add loading state for service data
  const [isGoogleLogin, setIsGoogleLogin] = useState(false); // New state for Google login

  const checkTokenExpiry = (token) => {
    try {
      const decodedToken = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      if (decodedToken.exp < currentTime) {
        localStorage.removeItem("paidsms-token");
        return null;
      }
      return decodedToken;
    } catch (error) {
      return null;
    }
  };

  const fetchUserData = async (userId) => {
    try {
      const apiKeyResponse = await axios.get(`/api_key?userId=${userId}`);

      const newApiKey = apiKeyResponse.data.api_key;
      setApiKey(newApiKey);
      fetchBalance(newApiKey);
    } catch (error) {
      console.log("from here");
      console.log(error.response.data.error);
    }
  };

  const fetchBalance = async (apiKey) => {
    try {
      const balanceResponse = await axios.get(`/balance?api_key=${apiKey}`);
      setBalance(balanceResponse.data.balance);
    } catch (error) {
      console.log(error.response.data.error);
    }
  };

  const fetchServiceData = async (userId) => {
    try {
      setLoadingServiceData(true);

      const response = await axios.get(
        `/get-service-data${userId ? `?userId=${userId}` : ""}`,
        {
          withCredentials: true,
        }
      );

      // Deduplicate the service data based on a unique property (e.g., `id` or `name`)
      const uniqueServices = Array.from(
        new Set(response.data.map((service) => service.name)) // Use a unique property here
      ).map((name) => response.data.find((service) => service.name === name));

      setServiceData(uniqueServices); // Update state with deduplicated data
    } catch (error) {
      console.log(error.response?.data?.error || "Error fetching service data");
    } finally {
      setLoadingServiceData(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("paidsms-token");
      if (token) {
        const user = checkTokenExpiry(token);
        if (user) {
          setUser(user);
          setIsGoogleLogin(user.logintype === "google"); // Update Google login state
          await fetchUserData(user.userId); // Fetch data for logged-in user
        } else {
          setUser(null);
          setIsGoogleLogin(false); // Reset Google login state
        }
      } else {
        setUser(null);
        setIsGoogleLogin(false); // Reset Google login state
      }

      fetchServiceData(); // Fetch service data unconditionally after user state is set
    };

    fetchData();
  }, []);

  const login = (token) => {
    const user = checkTokenExpiry(token);
    if (user) {
      localStorage.setItem("paidsms-token", token);
      setUser(user);
      setIsGoogleLogin(user.logintype === "google"); // Update Google login state
      fetchUserData(user.userId); // Fetch data for logged-in user
    }
  };

  const logout = () => {
    localStorage.removeItem("paidsms-token");
    setUser(null);
    setApiKey(null);
    setBalance(null);
    setIsGoogleLogin(false); // Reset Google login state
    fetchServiceData(); // Fetch data for logged-out user
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        apiKey,
        setApiKey,
        setBalance,
        balance,
        login,
        logout,
        fetchBalance,
        maintainance,
        setMaintainance,
        serviceData, // Provide service data to the context consumers
        loadingServiceData, // Provide loading state for service data
        isGoogleLogin, // Provide Google login state to context consumers
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

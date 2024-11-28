import { isValidEmail } from "6pp";

export const emailValidator = (email) => {
  if (!isValidEmail(email))
    return { isValid: false, errorMessage: "Email is Invalid" };
};

export const passwordValidator = (password) => {
  if (!password || password.length < 6) {
    return {
      isValid: false,
      errorMessage: "Password must be at least 6 characters long",
    };
  }
  return { isValid: true, errorMessage: "" };
};

export const confirmPasswordValidator = (confirmPassword, password) => {
  console.log("confirmPassword:", confirmPassword);
  console.log("password:", password);

  if (!confirmPassword) {
    return { isValid: false, errorMessage: "Please confirm your password" };
  }

  if (confirmPassword !== password) {
    return { isValid: false, errorMessage: "Passwords do not match" };
  }

  return { isValid: true, errorMessage: "" };
};

// Pass minimum amount dynamically
export const amountValidator = (amount, minimumAmount = 50) => {
  if (!amount || amount < minimumAmount) {
    return {
      isValid: false,
      errorMessage: `Minimum amount is ₹${minimumAmount}`,
    };
  }
  return { isValid: true, errorMessage: "" };
};

export const trxAmountValidator = (trxamount) => {
  if (!trxamount || trxamount < 1) {
    return { isValid: false, errorMessage: "Minimum trx is 1 trx" };
  }
  return { isValid: true, errorMessage: "" };
};

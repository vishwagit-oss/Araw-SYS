"use client";

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from "amazon-cognito-identity-js";

function getUserPool(): CognitoUserPool {
  const poolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
  if (!poolId || !clientId) {
    throw new Error("Both UserPoolId and ClientId are required. Set NEXT_PUBLIC_COGNITO_USER_POOL_ID and NEXT_PUBLIC_COGNITO_CLIENT_ID in .env.local");
  }
  return new CognitoUserPool({ UserPoolId: poolId, ClientId: clientId });
}

export function signUp(
  email: string,
  password: string,
  name: string
): Promise<{ userSub: string; cognitoUsername: string }> {
  return new Promise((resolve, reject) => {
    const attributes = [
      new CognitoUserAttribute({ Name: "email", Value: email }),
      new CognitoUserAttribute({ Name: "name", Value: name }),
      new CognitoUserAttribute({ Name: "preferred_username", Value: email }),
    ];
    const username = `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    getUserPool().signUp(username, password, attributes, [], (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      const cognitoUsername = result?.user.getUsername() ?? username;
      resolve({ userSub: cognitoUsername, cognitoUsername });
    });
  });
}

export function confirmRegistration(username: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: username.trim(),
      Pool: getUserPool(),
    });
    cognitoUser.confirmRegistration(code.trim(), true, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function resendConfirmationCode(username: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: username.trim(),
      Pool: getUserPool(),
    });
    cognitoUser.resendConfirmationCode((err) => (err ? reject(err) : resolve()));
  });
}

export function signIn(email: string, password: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: getUserPool(),
    });
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
    });
  });
}

export function signOut(): void {
  try {
    const user = getUserPool().getCurrentUser();
    if (user) user.signOut();
  } catch {
    // env not set (e.g. build time)
  }
}

export async function getAuthToken(): Promise<string | null> {
  const session = await getSession();
  return session?.idToken ?? null;
}

export interface CurrentUser {
  email: string;
  name: string;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = await getAuthToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as {
      email?: string;
      name?: string;
      "cognito:username"?: string;
    };
    const email = payload.email ?? payload["cognito:username"] ?? "User";
    const name = payload.name ?? email.split("@")[0] ?? "User";
    return { email, name };
  } catch {
    return null;
  }
}

export function getSession(): Promise<{
  idToken: string;
  accessToken: string;
} | null> {
  return new Promise((resolve) => {
    let user;
    try {
      user = getUserPool().getCurrentUser();
    } catch {
      resolve(null);
      return;
    }
    if (!user) {
      resolve(null);
      return;
    }
    user.getSession((err: Error | null, session: { isValid: () => boolean; getIdToken: () => { getJwtToken: () => string }; getAccessToken: () => { getJwtToken: () => string } } | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
        return;
      }
      resolve({
        idToken: session.getIdToken().getJwtToken(),
        accessToken: session.getAccessToken().getJwtToken(),
      });
    });
  });
}

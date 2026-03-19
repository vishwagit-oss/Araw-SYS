import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS_URL = `https://cognito-idp.${process.env.AWS_REGION ?? "us-east-2"}.amazonaws.com/${process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID}/.well-known/jwks.json`;

const jwks = createRemoteJWKSet(new URL(JWKS_URL));

export async function verifyCognitoToken(token: string): Promise<{
  sub: string;
  email?: string;
} | null> {
  try {
    const { payload } = await jwtVerify(token, jwks);
    const email =
      (payload.email as string | undefined) ||
      (payload.preferred_username as string | undefined);
    const emailStr =
      typeof email === "string" && email.includes("@") ? email : undefined;
    return {
      sub: payload.sub as string,
      email: emailStr,
    };
  } catch {
    return null;
  }
}

export function getTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}

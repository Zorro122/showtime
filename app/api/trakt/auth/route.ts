import { NextResponse } from "next/server";
import crypto from "crypto";

function base64URLEncode(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest();
}

export async function GET(request: Request) {
  const codeVerifier = base64URLEncode(crypto.randomBytes(32));
  const codeChallenge = base64URLEncode(sha256(codeVerifier));

  // Use NEXTAUTH_URL (your real public URL), not HOST (a bind address)
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/trakt/callback`;

  const authorizeUrl = new URL("https://auth.trakt.tv/oauth/authorize");
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", process.env.TRAKT_CLIENT_ID!);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");

  const response = NextResponse.redirect(authorizeUrl.toString());
  response.cookies.set("trakt_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return response;
}

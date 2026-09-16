import { Collection } from "@/lib/mongo/mongo";
import { TraktAPI } from "@/lib/trakt/Trakt";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const codeVerifier = request.headers
    .get("cookie")
    ?.match(/trakt_code_verifier=([^;]+)/)?.[1];

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/trakt/callback`;

  const data = {
    code,
    client_id: process.env.TRAKT_CLIENT_ID,
    client_secret: process.env.TRAKT_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    code_verifier: codeVerifier,
  };

  try {
    const response = await fetch("https://auth.trakt.tv/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const access_token = await response.json();
    const col = await Collection("users");
    const trakt = new TraktAPI();
    const user_slug = await trakt._request("users/me", "GET", undefined, {
      Authorization: `Bearer ${access_token.access_token}`,
    });

    const user = await col.findOne({ slug: user_slug });
    if (user) {
      await col.updateOne({ slug: user_slug }, { $set: { access_token } });
    } else {
      await col.insertOne({ slug: user_slug, access_token });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : error, status: "error" },
      { status: 500 },
    );
  }
  return NextResponse.redirect(new URL("/", request.url).href);
}

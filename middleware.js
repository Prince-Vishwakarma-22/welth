import arcjet, { createMiddleware, detectBot, shield } from "@arcjet/next";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Protect only specific routes
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/account(.*)",
  "/transaction(.*)",
]);

// ✅ Use DRY_RUN in production to avoid false 403s
const isProduction = process.env.NODE_ENV === "production";

// Arcjet middleware with DRY_RUN in production
const aj = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [
    shield({
      mode: isProduction ? "DRY_RUN" : "LIVE",
    }),
    detectBot({
      mode: isProduction ? "DRY_RUN" : "LIVE",
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
        "GO_HTTP", // For Inngest
      ],
    }),
  ],
});

// Clerk middleware for protected routes
const clerk = clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  if (!userId && isProtectedRoute(req)) {
    const { redirectToSignIn } = await auth();
    return redirectToSignIn();
  }

  return NextResponse.next();
});

// Combine Arcjet → Clerk
export default createMiddleware(aj, clerk);

// Matcher for Next.js to exclude static files and internal routes
export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

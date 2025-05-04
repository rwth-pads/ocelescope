import { NextRequest, NextResponse } from "next/server";

export const middleware = (request: NextRequest) => {
  const sessionId = request.cookies.get("Ocean-Session-Id");

  if (!sessionId && request.nextUrl.pathname !== "/") {
    return NextResponse.redirect(new URL("/", request.url));
  }
};

export const config = {
  matcher: ["/", "/plugins"],
};

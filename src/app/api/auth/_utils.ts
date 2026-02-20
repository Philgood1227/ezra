import { NextResponse } from "next/server";

export function jsonWithCookies<T extends object>(
  cookieSource: NextResponse,
  payload: T,
  init?: ResponseInit,
): NextResponse<T> {
  const response = NextResponse.json(payload, init);
  cookieSource.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });
  return response;
}

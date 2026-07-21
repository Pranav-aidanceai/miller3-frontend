// TEMPORARY diagnostic — DELETE after confirming the Azure App Setting loads.
export async function GET() {
  return Response.json({
    apiBaseUrl: process.env.API_BASE_URL ?? null,
    isSet: Boolean(process.env.API_BASE_URL),
  });
}
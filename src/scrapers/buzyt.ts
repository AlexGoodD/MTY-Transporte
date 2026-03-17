import type { RouteBasic, Route } from "../types.js";

const API_URL = "https://api.buz.yt/graphql/";

const QUERY_ATOB = `
  query atob($aLat: Float!, $aLng: Float!, $bLat: Float!, $bLng: Float!) {
    atob(aLat: $aLat, aLng: $aLng, bLat: $bLat, bLng: $bLng) {
      status
      items {
        routes { id shortName longName type color }
      }
    }
  }
`;

const QUERY_ROUTES_BY_ID = `
  query getRouteById($id: [ID!]) {
    routes(id: $id) {
      id encodedLine shortName longName slug type color
      entity { id }
      trips {
        headsign
        stops { name lat lng }
      }
    }
  }
`;

async function gql<T>(
  operationName: string,
  query: string,
  variables: object,
): Promise<T> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operationName, query, variables }),
  });
  if (!res.ok) throw new Error(`buz.yt error: ${res.status}`);
  return res.json();
}

export async function getRoutesBetween(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): Promise<RouteBasic[]> {
  const json: any = await gql("atob", QUERY_ATOB, { aLat, aLng, bLat, bLng });
  return json?.data?.atob?.items?.flatMap((i: any) => i.routes) ?? [];
}

export async function getRoutesById(ids: string[]): Promise<Route[]> {
  const json: any = await gql("getRouteById", QUERY_ROUTES_BY_ID, { id: ids });
  return json?.data?.routes ?? [];
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string> {
  const res = await fetch(
    `https://api.buz.yt/places?action=reverseGeocode&latlng=${lat},${lng}`,
    {
      headers: {
        Origin: "https://rutadirecta.com",
        Referer: "https://rutadirecta.com/",
      },
    },
  );
  const json: any = await res.json();
  return json?.name ?? `${lat},${lng}`;
}

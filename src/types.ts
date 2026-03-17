export interface Route {
  id: string;
  shortName: string;
  longName: string;
  slug: string;
  type: string;
  color: string | null;
  encodedLine: string;
  entity: { id: string } | null;
  trips: Trip[];
}

export interface Trip {
  headsign: string;
  stops: Stop[];
}

export interface Stop {
  name: string;
  lat: number;
  lng: number;
}

export interface RouteBasic {
  id: string;
  shortName: string;
  longName: string;
  type: string;
  color: string | null;
}

export interface GeoJSONFeature {
  type: "Feature";
  properties: Record<string, any>;
  geometry: {
    type: "LineString" | "Point";
    coordinates: number[][];
  };
}

export interface GeoJSONCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

export interface CachedResult {
  result: string;
  cached_at: string;
}
